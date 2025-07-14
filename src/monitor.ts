/* eslint-disable no-console */

import { sendToAPI, getConfig } from "./client";
import type { MonitorOptions, Middleware } from "./types";
import { toApiString } from "./utils";

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

// May be deprecated if not needed
function shouldMonitor<TArgs extends any[]>(
  options: MonitorOptions<TArgs, any>,
  args: TArgs,
): boolean {
  // Check if monitoring is enabled
  if (typeof options.enabled === "boolean" && !options.enabled) {
    return false;
  }
  if (typeof options.enabled === "function" && !options.enabled(args)) {
    return false;
  }

  // Check sample rate
  if (options.sampleRate !== undefined && Math.random() > options.sampleRate) {
    return false;
  }

  return true;
}

//TODO XC : See if we need this
//TODO SR : See if we need this
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
    if (getConfig().verbose) {
      console.log("[Olakai SDK] Data successfully sanitized");
    }
    return parsed;
  } catch {
    if (getConfig().debug) {
      console.warn("[Olakai SDK] Data failed to sanitize");
    }
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
 * Safely execute monitoring operations without affecting the original function
 * @param operation - The monitoring operation to execute
 * @param context - Context information for debugging
 */
function safeMonitoringOperation(
  operation: () => void | Promise<void>,
  context: string,
) {
  try {
    const result = operation();
    // Handle both sync and async operations
    if (result && typeof result.catch === "function") {
      result.catch((error) => {
        const config = getConfig();
        if (config.debug) {
          console.warn(
            `[Olakai SDK] Monitoring operation failed (${context}):`,
            error,
          );
        }
        // Call global error handler if configured
        if (config.onError) {
          try {
            config.onError(error);
          } catch (handlerError) {
            if (config.debug) {
              console.warn(
                "[Olakai SDK] Error handler itself failed:",
                handlerError,
              );
            }
          }
        }
      });
    }
  } catch (error) {
    const config = getConfig();
    if (config.debug) {
      console.warn(
        `[Olakai SDK] Monitoring operation failed (${context}):`,
        error,
      );
    }
    // Call global error handler if configured
    if (config.onError) {
      try {
        config.onError(error);
      } catch (handlerError) {
        if (config.debug) {
          console.warn(
            "[Olakai SDK] Error handler itself failed:",
            handlerError,
          );
        }
      }
    }
  }
}

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
      // Check if we should monitor this call - if not, just execute the function
      let shouldMonitorCall = false;
      try {
        shouldMonitorCall = shouldMonitor(options, args);
      } catch (error) {
        safeMonitoringOperation(() => {
          throw error;
        }, "shouldMonitor check");
        // If monitoring check fails, still execute the function
        return fn(...args);
      }

      if (!shouldMonitorCall) {
        return fn(...args);
      }

      let config: any;
      let start: number;
      let processedArgs = args;

      // Safely initialize monitoring data
      try {
        config = getConfig();
        start = Date.now();
      } catch (error) {
        safeMonitoringOperation(() => {
          throw error;
        }, "monitoring initialization");
        // If monitoring setup fails, still execute the function
        return fn(...args);
      }

      // Safely apply beforeCall middleware
      safeMonitoringOperation(async () => {
        for (const middleware of middlewares) {
          if (middleware.beforeCall) {
            const result = await middleware.beforeCall(processedArgs);
            if (result) {
              processedArgs = result;
            }
          }
        }
      }, "beforeCall middleware");

      let result: TResult;
      let functionError: any = null;

      // ALWAYS execute the original function - this is the critical part
      try {
        result = await fn(...processedArgs);
      } catch (error) {
        functionError = error;
        throw error; // Re-throw the original error
      } finally {
        // Monitoring operations in finally block - they happen regardless of success/failure
        if (functionError) {
          // Handle error case monitoring
          safeMonitoringOperation(async () => {
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

              const payload = {
                prompt: "",
                response: "",
                errorMessage:
                  toApiString(errorInfo.errorMessage) +
                  toApiString(errorResult),
                chatId: "123",
                userId: "anonymous",
              };

              await sendToAPI(payload, {
                retries: options.retries,
                timeout: options.timeout,
                priority: "high", // Errors always get high priority
              });
            }
          }, "error monitoring");
        } else {
          // Handle success case monitoring
          safeMonitoringOperation(async () => {
            // Apply afterCall middleware
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

            // Capture success data
            const captureResult = options.capture({
              args: processedArgs,
              result,
            });
            const prompt = options.sanitize
              ? sanitizeData(captureResult.input, config.sanitizePatterns)
              : captureResult.input;
            const response = options.sanitize
              ? sanitizeData(captureResult.output, config.sanitizePatterns)
              : captureResult.output;

            const payload = {
              prompt: toApiString(prompt),
              response: toApiString(response),
              chatId: "123",
              userId: "anonymous",
              tokens: 0,
              requestTime: Number(Date.now() - start),
            };

            if (config.verbose) {
              console.log("[Olakai SDK] Successfully defined payload", payload);
            }

            // Send to API (with batching and retry logic handled in client)
            await sendToAPI(payload, {
              retries: options.retries,
              timeout: options.timeout,
              priority: options.priority || "normal",
            });
          }, "success monitoring");
        }
      }

      return result!; // We know result is defined if we get here (no function error)
    };
  };
}
