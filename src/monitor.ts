import { sendToAPI, sendToControlAPI, getConfig } from "./client";
import type { MonitorOptions, ControlPayload, ControlResponse, SDKConfig } from "./types";
import type { Middleware } from "./middleware";
import { olakaiLoggger, toApiString } from "./utils";

// Global middleware registry
const middlewares: Middleware<any, any>[] = [];

export function addMiddleware<TArgs extends any[], TResult>(
  middleware: Middleware<TArgs, TResult>,
) {
  middlewares.push(middleware);
}

export function removeMiddleware(name: string) {
  const index = middlewares.findIndex((m) => m.name === name);
  if (index > -1) {
    middlewares.splice(index, 1);
  }
}

async function shouldControl<TArgs extends any[]>(
  options: MonitorOptions<TArgs, any>,
  args: TArgs,
): Promise<boolean> {
  const controlOptions = options.control;
  
  // If control is not configured, allow execution
  if (!controlOptions) {
    return false;
  }
  
  // Check if control is enabled
  if (typeof controlOptions.enabled === "boolean" && !controlOptions.enabled) {
    return false;
  }
  if (typeof controlOptions.enabled === "function" && !controlOptions.enabled(args)) {
    return false;
  }
  
  try {
    const config = getConfig();
    
    // Prepare input for control check
    const input = controlOptions.captureInput(args);
    
    // Sanitize input if required
    const sanitizedInput = controlOptions.sanitize 
      ? sanitizeData(input, config.sanitizePatterns)
      : input;
    
    // Create control payload
    const payload: ControlPayload = {
      input: sanitizedInput,
    };
    
    // Send control request
    const response: ControlResponse = await sendToControlAPI(payload, {
      endpoint: controlOptions.endpoint,
      retries: controlOptions.retries,
      timeout: controlOptions.timeout,
      priority: controlOptions.priority,
    });
    
    olakaiLoggger(`Control response: ${JSON.stringify(response)}`, "info");
    
    // If not allowed, handle the blocking
    if (!response.allowed) {
      if (controlOptions.onBlocked) {
        // Let the developer handle the blocking
        controlOptions.onBlocked(args, response);
        // If onBlocked doesn't throw, we assume execution should be blocked
        return true;
      } else {
        // Default behavior: throw an error
        throw new Error(`Function execution blocked: ${response.reason || 'No reason provided'}`);
      }
    }
    
    return false; // Allow execution
    
  } catch (error) {
    if (controlOptions.onError) {
      // Let the developer decide what to do on error
      const shouldAllow = controlOptions.onError(error, args);
      if (shouldAllow) {
        olakaiLoggger(`Control error handled, allowing execution`, "info");
        return false; // Allow execution
      }
    }
    
    // If no error handler or it returns false, re-throw the error
    throw error;
  }
}

/**
 * Sanitize data by replacing sensitive information with a placeholder
 * @param data - The data to sanitize
 * @param patterns - The patterns to replace
 * @returns The sanitized data
 */
function sanitizeData(data: any, patterns?: RegExp[]): any {
  if (!patterns?.length) return data;

  let serialized = JSON.stringify(data);
  patterns.forEach((pattern) => {
    serialized = serialized.replace(pattern, "[REDACTED]");
  });

  try {
    const parsed = JSON.parse(serialized);
    olakaiLoggger(`Data successfully sanitized`, "info");
    return parsed;
  } catch {
    olakaiLoggger(`Data failed to sanitize`, "warn");
    return "[SANITIZED]";
  }
}

function createErrorInfo(error: any): {
  errorMessage: string;
  stackTrace?: string;
} {
  return {
    errorMessage: error instanceof Error ? error.message : String(error),
    stackTrace: error instanceof Error ? error.stack : undefined,
  };
}

/**
 * Resolve dynamic chatId and userId from options
 * @param options - Monitor options
 * @param args - Function arguments
 * @returns Object with resolved chatId and userId
 */
function resolveIdentifiers<TArgs extends any[]>(
  options: MonitorOptions<TArgs, any>,
  args: TArgs,
): { chatId: string; userId: string } {
  let chatId = "123";
  let userId = "anonymous";
  if (typeof options.chatId === "function") {
    try {
      chatId = options.chatId(args);
      olakaiLoggger("ChatId resolved...", "info");
    } catch (error) {
      olakaiLoggger(`Error during chatId resolution: ${error}. \n Continuing execution...`, "error");
    }
  } else {
    chatId = options.chatId || "123";
  }
  if (typeof options.userId === "function") {
    try {
      userId = options.userId(args);
      olakaiLoggger("UserId resolved...", "info");
    } catch (error) {
      olakaiLoggger(`Error during userId resolution: ${error}. \n Continuing execution...`, "error");
    }
  } else {
    userId = options.userId || "anonymous";
  }
    
  return { chatId, userId };
}

//TODO : Add a way to pass in a custom tasks/subtasks in the payload
/**
 * Monitor a function
 * @param options - The options for the monitored function
 * @param fn - The function to monitor
 * @returns The monitored function
 */
// Overload 1: curried
export function monitor<TArgs extends any[], TResult>(
  options: MonitorOptions<TArgs, TResult>,
): (
  fn: (...args: TArgs) => Promise<TResult>,
) => (...args: TArgs) => Promise<TResult>;

// Overload 2: direct
export function monitor<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: MonitorOptions<TArgs, TResult>,
): (...args: TArgs) => Promise<TResult>;

// Implementation
export function monitor<TArgs extends any[], TResult>(
  arg1: any,
  arg2?: any,
): any {
  if (typeof arg1 === "function" && arg2) {
    // Direct form: monitor(fn, options)
    const fn = arg1 as (...args: TArgs) => Promise<TResult>;
    const options = arg2 as MonitorOptions<TArgs, TResult>;
    return monitor(options)(fn);
  }
  // Curried form: monitor(options)(fn)
  const options = arg1 as MonitorOptions<TArgs, TResult>;
  return (fn: (...args: TArgs) => Promise<TResult>) => {
    return async (...args: TArgs): Promise<TResult> => {

      olakaiLoggger(`Monitoring function: ${fn.name}`, "info");
      olakaiLoggger(`Monitoring options: ${JSON.stringify(options)}`, "info");
      olakaiLoggger(`Monitoring arguments: ${JSON.stringify(args)}`, "info");

      let config: SDKConfig;
      let start: number;
      let processedArgs = args;

      // Safely initialize monitoring data
      try {
        config = getConfig();
        start = Date.now();
      } catch (error) {
        olakaiLoggger(`Monitoring initialization failed: \n${error}`, "error");
        // If monitoring setup fails, still execute the function
        return await fn(...args);
      }
      olakaiLoggger("Monitoring initialization completed...", "info");

      olakaiLoggger("Checking if we should control this call...", "info");
      let shouldControlCall = false;
      try {
        shouldControlCall = await shouldControl(options, args);
      } catch (error) {
        // If shouldControl throws an error, it means execution was blocked
        // We should re-throw this error to prevent function execution
        throw error;
      }
      olakaiLoggger("Should control check completed...", "info");

      //If we should control (block execution), return early
      if (shouldControlCall) {
        // This should not happen in normal flow as shouldControl throws on block
        // But kept for safety
        throw new Error("Function execution blocked by control logic");
      }

      olakaiLoggger("Applying beforeCall middleware...", "info");

      try {
        for (const middleware of middlewares) {
          if (middleware.beforeCall) {
            const result = await middleware.beforeCall(processedArgs);
            if (result) {
              processedArgs = result;
            }
          }
        }
      } catch (error) {
        olakaiLoggger(`BeforeCall middleware failed: ${error}. \n Continuing execution...`, "error");
      }

      olakaiLoggger("BeforeCall middleware completed...", "info");

      let result: TResult;
      let functionError: any = null;

      olakaiLoggger("Executing the original function...", "info");
      try {
        result = await fn(...processedArgs);

        olakaiLoggger("Original function executed successfully...", "info");

      } catch (error) {
        olakaiLoggger(`Original function failed: ${error}. \n Continuing execution...`, "error");
        functionError = error;
          // Handle error case monitoring
          try {
            // Apply error middleware
            for (const middleware of middlewares) {
              if (middleware.onError) {
                await middleware.onError(functionError, processedArgs);
              }
            }

            // Capture error data if onError handler is provided
            if (options.onError) {
              const errorResult = options.onError(functionError, processedArgs);
              const errorInfo = createErrorInfo(functionError);

              const { chatId, userId } = resolveIdentifiers(options, args);

              const payload = {
                prompt: "",
                response: "",
                errorMessage:
                  toApiString(errorInfo.errorMessage) +
                  toApiString(errorResult),
                chatId: toApiString(chatId),
                userId: toApiString(userId),
              };

              await sendToAPI(payload, {
                retries: config.retries,
                timeout: config.timeout,
                priority: "high", // Errors always get high priority
              });
            }
          } catch (error) {
            olakaiLoggger(`Error during error monitoring: ${error}.`, "error");
          };

          olakaiLoggger("Error monitoring completed...", "info");

          throw functionError; // Re-throw the original error to be handled by the caller
      } 
        // Handle success case asynchronously
      makeMonitoringCall(result, processedArgs, args, options, config, start);
      return result; // We know result is defined if we get here (no function error)
    };
  };
}

async function makeMonitoringCall<TArgs extends any[], TResult>(
  result: TResult,
  processedArgs: TArgs,
  args: TArgs,
  options: MonitorOptions<TArgs, TResult>,
  config: SDKConfig,
  start: number,
) {
  try {

    olakaiLoggger("Applying afterCall middleware...", "info");

    for (const middleware of middlewares) {
      if (middleware.afterCall) {
        const middlewareResult = await middleware.afterCall(
          result,
          processedArgs,
        );
        if (middlewareResult) {
          result = middlewareResult;
        }
      }
    }
  } catch (error) {
    olakaiLoggger(`Error during afterCall middleware: ${error}. \n Continuing execution...`, "error");
  }

  olakaiLoggger("AfterCall middleware completed...", "info");

  olakaiLoggger("Capturing success data...", "info");
        // Capture success data
  const captureResult = options.capture({
    args: processedArgs,
    result,
  });

  olakaiLoggger("Success data captured...", "info");

  const prompt = options.sanitize
    ? sanitizeData(captureResult.input, config.sanitizePatterns)
    : captureResult.input;
  const response = options.sanitize
    ? sanitizeData(captureResult.output, config.sanitizePatterns)
    : captureResult.output;

  olakaiLoggger("Resolving identifiers...", "info");

  const { chatId, userId } = resolveIdentifiers(options, args);

  olakaiLoggger("Creating payload...", "info");

  const payload = {
    prompt: toApiString(prompt),
    response: toApiString(response),
    chatId: toApiString(chatId),
    userId: toApiString(userId),
    tokens: 0,
    requestTime: Number(Date.now() - start),
    ...((options.task !== undefined && options.task !== "") ? { task: options.task } : {}),
    ...((options.subTask !== undefined && options.subTask !== "") ? { subTask: options.subTask } : {}),
    ...((options.shouldScore !== undefined) ? { shouldScore: options.shouldScore } : {}),
    };

  olakaiLoggger(`Successfully defined payload: ${JSON.stringify(payload)}`, "info");

  // Send to API (with batching and retry logic handled in client)
  try {
    await sendToAPI(payload, {
          retries: config.retries,
          timeout: config.timeout,
          priority: options.priority || "normal",
        });
  } catch (error) {
    olakaiLoggger(`Error during api call: ${error}.`, "error");
  }
  olakaiLoggger("API call completed...", "info");

  //End of monitoring operations
  olakaiLoggger("Monitoring operations completed...", "info");
}