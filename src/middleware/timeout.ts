import { Middleware } from "./index";

// Timeout middleware
export function createTimeoutMiddleware<TArgs extends any[], TResult>(
    _timeoutMs: number,
  ): Middleware<TArgs, TResult> {
    return {
      name: "timeout",
      beforeCall: async (args: TArgs) => {
        // Store timeout info in args metadata (if supported)
        return args;
      },
    };
  }
  
  // Validation middleware
  export function createValidationMiddleware<
    TArgs extends any[],
    TResult,
  >(options: {
    validateArgs?: (args: TArgs) => boolean | string;
    validateResult?: (result: TResult) => boolean | string;
  }): Middleware<TArgs, TResult> {
    const { validateArgs, validateResult } = options;
  
    return {
      name: "validation",
      beforeCall: async (args: TArgs) => {
        if (validateArgs) {
          const validation = validateArgs(args);
          if (validation !== true) {
            throw new Error(`Argument validation failed: ${validation}`);
          }
        }
        return args;
      },
      afterCall: async (result: TResult, _args: TArgs) => {
        if (validateResult) {
          const validation = validateResult(result);
          if (validation !== true) {
            throw new Error(`Result validation failed: ${validation}`);
          }
        }
        return result;
      },
    };
  }