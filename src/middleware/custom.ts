import type { Middleware } from "./index";

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