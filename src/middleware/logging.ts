import { Middleware } from "./index";

// Logging middleware
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