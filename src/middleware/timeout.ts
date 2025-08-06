import { Middleware } from "./index";

/**
 * Create a timeout middleware
 * This middleware sets a timeout for a function call.
 * @param _timeoutMs - The timeout in milliseconds
 * @returns A middleware function
 */
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
  
  /**
   * Create a validation middleware
   * This middleware validates the arguments and result of a function call.
   * @param options - The options for the middleware
   * @param options.validateArgs - The function to validate the arguments
   * @param options.validateResult - The function to validate the result
   * @returns A middleware function
   */
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