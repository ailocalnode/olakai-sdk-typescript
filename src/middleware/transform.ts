import { Middleware } from "./index";

/**
 * Create a transform middleware
 * This middleware transforms the arguments and result of a function call.
 * @param options - The options for the middleware
 * @param options.transformArgs - The function to transform the arguments
 * @param options.transformResult - The function to transform the result
 * @returns A middleware function
 * Important point: this Middleware is applied after the Control call to OLakai API.
 * So this middleware will only modify the way that data is ent to fthe function and to the monitoring part of this API. 
 */
export function createTransformMiddleware<
  TArgs extends any[],
  TResult,
>(options: {
  transformArgs?: (args: TArgs) => TArgs | Promise<TArgs>;
  transformResult?: (result: TResult) => TResult | Promise<TResult>;
}): Middleware<TArgs, TResult> {
  const { transformArgs, transformResult } = options;

  return {
    name: "transform",
    beforeCall: async (args: TArgs) => {
      if (transformArgs) {
        return await transformArgs(args);
      }
      return args;
    },
    afterCall: async (result: TResult, _args: TArgs) => {
      if (transformResult) {
        return await transformResult(result);
      }
      return result;
    },
  };
}