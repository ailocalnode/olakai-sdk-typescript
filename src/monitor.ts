import { sendToAPI, getConfig } from "./client";
import type { MonitorOptions, ControlPayload, SDKConfig, ControlAPIResponse, MonitorPayload } from "./types";
import type { Middleware } from "./middleware";
import { olakaiLogger, toApiString } from "./utils";
import { OlakaiFunctionBlocked } from "./exceptions";
import { applyMiddleware } from "./middleware";

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

async function shouldAllowCall<TArgs extends any[]>(
  options: MonitorOptions<TArgs, any>,
  args: TArgs,
): Promise<ControlAPIResponse> {
  
  try {
    const { chatId, email } = resolveIdentifiers(options, args);
    
    // Create control payload
    const payload: ControlPayload = {
      prompt: toApiString(args.length === 1 ? args[0] : args),
      chatId: chatId,
      task: options.task,
      subTask: options.subTask,
      tokens: 0,
      email: email,
      overrideControlCriteria: options.askOverride,
    };
    
    // Send control request
    const response: ControlAPIResponse = await sendToAPI(payload, "control") as ControlAPIResponse;
    
    olakaiLogger(`Control response: ${JSON.stringify(response)}`, "info");
    
    // If not allowed, handle the blocking
    if (!response.allowed) {
      return response;
    } 
    return response;
    
  } catch (error) {
    olakaiLogger(`Control call failed, disallowing execution ${error}`, "error");
    return {
      allowed: false,
      details: {
        detectedSensitivity: [],
        isAllowedPersona: false,
      },
    }; 
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
    olakaiLogger(`Data successfully sanitized`, "info");
    return parsed;
  } catch {
    olakaiLogger(`Data failed to sanitize`, "warn");
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
      olakaiLogger("ChatId resolved...", "info");
    } catch (error) {
      olakaiLogger(`Error during chatId resolution: ${error}. \n Continuing execution...`, "error");
    }
  } else {
    chatId = options.chatId || "123";
  }
  if (typeof options.email === "function") {
    try {
      email = options.email(args);
      olakaiLogger("Email resolved...", "info");
    } catch (error) {
      olakaiLogger(`Error during userId resolution: ${error}. \n Continuing execution...`, "error");
    }
  } else {
    email = options.email || "anonymous@olakai.ai";
  }
    
  return { chatId, email };
}

//TODO : Add a way to pass in a custom tasks/subtasks in the payload
/**
 * Monitor a function and send the data to the Olakai API
 * Always returns an async function, but can monitor both sync and async functions
 * @param options - The options for the monitored function
 * @param fn - The function to monitor (sync or async)
 * @returns The monitored async function
 * @throws {OlakaiFunctionBlocked} if the function is blocked by Olakai's Control API
 * @throws {Error} throw the original function's error if the function fails
 */

// Curried version
export function monitor<TArgs extends any[], TResult>(
  options: MonitorOptions<TArgs, TResult>,
): (
  fn: (...args: TArgs) => TResult | Promise<TResult>,
) => (...args: TArgs) => Promise<TResult>;

// Direct version
export function monitor<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => TResult | Promise<TResult>,
  options: MonitorOptions<TArgs, TResult>,
): (...args: TArgs) => Promise<TResult>;

// Implementation
export function monitor<TArgs extends any[], TResult>(
  arg1: any,
  arg2?: any,
): any {
  if (typeof arg1 === "function" && arg2) {
    // Direct form: monitor(fn, options)
    const fn = arg1;
    const options = arg2 as MonitorOptions<TArgs, TResult>;
    return monitor(options)(fn);
  }
  // Curried form: monitor(options)(fn)
  const options = arg1 as MonitorOptions<TArgs, TResult>;
  
  return (fn: (...args: TArgs) => TResult | Promise<TResult>) => {
    return async (...args: TArgs): Promise<TResult> => {
      olakaiLogger(`Monitoring function: ${fn.name}`, "info");
      olakaiLogger(`Monitoring options: ${JSON.stringify(options)}`, "info");
      olakaiLogger(`Monitoring arguments: ${JSON.stringify(args)}`, "info");

      let config: SDKConfig;
      let start: number;
      let processedArgs = args;

      // Safely initialize monitoring data
      try {
        config = getConfig();
        start = Date.now();
      } catch (error) {
        olakaiLogger(`Monitoring initialization failed: \n${error}`, "error");
        // If monitoring setup fails, still execute the function
        const result = await Promise.resolve(fn(...args));
        return result;
      }
      olakaiLogger("Monitoring initialization completed...", "info");

      olakaiLogger("Checking if we should control this call...", "info");

      const shouldAllow = await shouldAllowCall(options, args);

      olakaiLogger("Should control check completed...", "info");

      //If we should control (block execution), throw an error
      if (!shouldAllow.allowed) {
        olakaiLogger("Function execution blocked by Olakai's Control API", "error");
        const { chatId, email } = resolveIdentifiers(options, args)

        const payload: MonitorPayload = {
          prompt: toApiString(args.length === 1 ? args[0] : args),
          response: "",
          chatId: toApiString(chatId),
          email: toApiString(email),
          task: options.task,
          subTask: options.subTask,
          blocked: true,
          tokens: 0,
        }

        sendToAPI(payload, "monitoring", {
          retries: config.retries,
          timeout: config.timeout,
          priority: "high", // Errors always get high priority
        });

        throw new OlakaiFunctionBlocked("Function execution blocked by Olakai's Control API", shouldAllow.details);
      }

      olakaiLogger("Applying beforeCall middleware...", "info");

      try {
        processedArgs = await applyMiddleware(middlewares, processedArgs, "beforeCall");
      } catch (error) {
        olakaiLogger(`BeforeCall middleware failed: ${error}. \n Continuing execution...`, "error");
      }

      olakaiLogger("BeforeCall middleware completed...", "info");

      let result: TResult;

      olakaiLogger("Executing the original function...", "info");
      try {
        // Handle both sync and async functions uniformly
        const functionResult = fn(...processedArgs);
        result = await Promise.resolve(functionResult);

        olakaiLogger("Original function executed successfully...", "info");

      } catch (error) {
        olakaiLogger(`Original function failed: ${error}. \n Continuing execution...`, "error");
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
  let processedResult: TResult = result;
  try {

    olakaiLogger("Applying afterCall middleware...", "info");

    processedResult = await applyMiddleware(middlewares, processedArgs, "afterCall", result) as TResult;
  } catch (error) {
    olakaiLogger(`Error during afterCall middleware: ${error}. \n Continuing execution...`, "error");
  }

  olakaiLogger("AfterCall middleware completed...", "info");

  olakaiLogger("Capturing success data...", "info");
        // Capture success data
  const captureResult = options.capture({
    args: processedArgs,
    result: processedResult,
  });

  olakaiLogger("Success data captured...", "info");

  const prompt = options.sanitize
    ? sanitizeData(captureResult.input, config.sanitizePatterns)
    : captureResult.input;
  const response = options.sanitize
    ? sanitizeData(captureResult.output, config.sanitizePatterns)
    : captureResult.output;

  olakaiLogger("Resolving identifiers...", "info");

  const { chatId, email } = resolveIdentifiers(options, args);

  olakaiLogger("Creating payload...", "info");

  const payload: MonitorPayload = {
    prompt: toApiString(prompt),
    response: toApiString(response),
    chatId: toApiString(chatId),
    email: toApiString(email),
    tokens: 0,
    requestTime: Number(Date.now() - start),
    ...((options.task !== undefined && options.task !== "") ? { task: options.task } : {}),
    ...((options.subTask !== undefined && options.subTask !== "") ? { subTask: options.subTask } : {}),
    blocked: false,
    };

  olakaiLogger(`Successfully defined payload: ${JSON.stringify(payload)}`, "info");

  // Send to API (with batching and retry logic handled in client)
  try {
    await sendToAPI(payload, "monitoring", {
      retries: config.retries,
      timeout: config.timeout,
      priority: options.priority || "normal",
    });
  } catch (error) {
    olakaiLogger(`Error during api call: ${error}.`, "error");
  }
  olakaiLogger("API call completed...", "info");

  //End of monitoring operations

  olakaiLogger("Monitoring operations completed...", "info");
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
  const payload: MonitorPayload = {
    prompt: "",
    response: "",
    errorMessage: toApiString(errorInfo.errorMessage) + toApiString(errorInfo.stackTrace),
    chatId: toApiString(chatId),
    email: toApiString(email),
  }

  await sendToAPI(payload, "monitoring", {
    retries: config.retries,
    timeout: config.timeout,
    priority: "high", // Errors always get high priority
  });
    } catch (error) {
      olakaiLogger(`Error during error monitoring: ${error}.`, "error");
    }
    olakaiLogger("Error monitoring completed...", "info");
  }
}

