import { Middleware } from "./index";

// Data transformation middleware
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