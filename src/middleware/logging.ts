import { Middleware } from "./index";

/**
 * Create a logging middleware
 * This middleware logs the function call and the result.
 * @param options - The options for the middleware
 * @default options - {
 *  level: "info",         // The level of the log (debug, info, warn, error)
 *  includeArgs: false,    // Whether to include the arguments in the log
 *  includeResult: false,  // Whether to include the result in the log
 *  logger: console,       // The logger to use
 * }
 * @returns A middleware function
 */
export function createLoggingMiddleware<TArgs extends any[], TResult>(options: {
    level?: "debug" | "info" | "warn" | "error";
    includeArgs?: boolean;
    includeResult?: boolean;
    logger?: Console;
  }): Middleware<TArgs, TResult> {
    const {
      level = "info",
      includeArgs = false,
      includeResult = false,
      logger = console,
    } = options;
  
    return {
      name: "logging",
      beforeCall: async (args: TArgs) => {
        if (includeArgs) {
          logger[level]("[Olakai SDK] Calling function with args:", args);
        } else {
          logger[level]("[Olakai SDK] Calling function");
        }
        return args;
      },
      afterCall: async (result: TResult, _args: TArgs) => {
        if (includeResult) {
          logger[level]("[Olakai SDK] Function completed with result:", result);
        } else {
          logger[level]("[Olakai SDK] Function completed successfully");
        }
        return result;
      },
      onError: async (error: any, _args: TArgs) => {
        logger.error("[Olakai SDK] Function failed with error:", error);
      },
    };
  }