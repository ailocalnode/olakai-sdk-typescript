import type { Middleware } from "./index";

/**
 * Create a custom middleware
 * This middleware is a generic middleware that can be used to create any middleware.
 * @param options - The options for the middleware
 * @param options.name - The name of the middleware
 * @param options.beforeCall - The function to call before the function is called
 * @param options.afterCall - The function to call after the function is called
 * @param options.onError - The function to call if the function throws an error. This is useful for error handling.
 * @returns A middleware function
 */
export const createCustomMiddleware = <TArgs extends any[], TResult>(options: {
  name: string;
  beforeCall?: (args: TArgs) => TArgs | Promise<TArgs>;
  afterCall?: (result: TResult, args: TArgs) => TResult | Promise<TResult>;
  onError?: (error: any, args: TArgs) => void | Promise<void>;
}): Middleware<TArgs, TResult> => {
  return {
    name: options.name,
    beforeCall: options.beforeCall,
    afterCall: options.afterCall,
    onError: options.onError,
  };
};