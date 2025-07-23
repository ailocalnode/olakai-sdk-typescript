import { sendToAPI, sendToControlAPI, getConfig } from "./client";
import type { MonitorOptions, ControlPayload, SDKConfig, ControlAPIResponse } from "./types";
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
  const controlOptions = options.controlOptions;
  
  // If control is not configured, allow execution
  if (!controlOptions) {
    return false;
  }
  
  try {
    const config = getConfig();
    
    // Prepare input for control check
    const input = options.capture({ args, result: null });

    const { chatId, email } = resolveIdentifiers(options, args);
    
    // Create control payload
    const payload: ControlPayload = {
      prompt: input.input,
      email: email,
      askedOverride: controlOptions.askOverride,
    };
    
    // Send control request
    const response: ControlAPIResponse = await sendToControlAPI(payload);
    
    olakaiLoggger(`Control response: ${JSON.stringify(response)}`, "info");
    
    // If not allowed, handle the blocking
    if (!response.allowed) {
      return true;
    } 
    return false;
    
  } catch (error) {
    olakaiLoggger(`Control call failed, disallowing execution ${error}`, "error");
    return true; // Allow execution
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
): { chatId: string; email: string } {
  let chatId = "123";
  let email = "anonymous@olakai.ai";
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
  if (typeof options.email === "function") {
    try {
      email = options.email(args);
      olakaiLoggger("Email resolved...", "info");
    } catch (error) {
      olakaiLoggger(`Error during userId resolution: ${error}. \n Continuing execution...`, "error");
    }
  } else {
    email = options.email || "anonymous@olakai.ai";
  }
    
  return { chatId, email };
}

//TODO : Add a way to pass in a custom tasks/subtasks in the payload
/**
 * Monitor a function and send the data to the Olakai API
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

      const shouldControlCall = false; //await shouldControl(options, args);

      olakaiLoggger("Should control check completed...", "info");

      //If we should control (block execution), throw an error
      if (shouldControlCall) {
        throw new Error("Function execution blocked by Olakai's Control API");
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

      olakaiLoggger("Executing the original function...", "info");
      try {
        result = await fn(...processedArgs);

        olakaiLoggger("Original function executed successfully...", "info");

      } catch (error) {
        olakaiLoggger(`Original function failed: ${error}. \n Continuing execution...`, "error");
        // Handle error case monitoring
        reportError(error, processedArgs, options, config);

        throw error; // Re-throw the original error to be handled by the caller
      } 
        // Handle success case asynchronously
      makeMonitoringCall(result, processedArgs, args, options, config, start);
      return result; // We know result is defined if we get here (no function error)
    };
  };
}

/**
 * Make the monitoring call
 * @param result - The result of the monitored function
 * @param processedArgs - The processed arguments
 * @param args - The original arguments
 * @param options - The options for the monitored function
 * @param config - The configuration for the monitored function
 * @param start - The start time of the monitored function
 */
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

  const { chatId, email } = resolveIdentifiers(options, args);

  olakaiLoggger("Creating payload...", "info");

  const payload = {
    prompt: toApiString(prompt),
    response: toApiString(response),
    chatId: toApiString(chatId),
    email: toApiString(email),
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


/**
 * Report an error to the API
 * @param functionError - The error from the monitored function
 * @param args - The original arguments
 * @param options - The options for the monitored function
 * @param config - The configuration for the monitored function
 */
async function reportError<TArgs extends any[], TResult>(
  functionError: any, 
  args: TArgs, 
  options: MonitorOptions<TArgs, TResult>, 
  config: SDKConfig
) {
  if (options.onMonitoredFunctionError ?? true) {
    try {
      const errorInfo = createErrorInfo(functionError);
  const { chatId, email } = resolveIdentifiers(options, args);
  const payload = {
    prompt: "",
    response: "",
    errorMessage: toApiString(errorInfo.errorMessage) + toApiString(errorInfo.stackTrace),
    chatId: toApiString(chatId),
    email: toApiString(email),
  }
  await sendToAPI(payload, {
    retries: config.retries,
      timeout: config.timeout,
      priority: "high", // Errors always get high priority
    });
    } catch (error) {
      olakaiLoggger(`Error during error monitoring: ${error}.`, "error");
    }
    olakaiLoggger("Error monitoring completed...", "info");
  }
}