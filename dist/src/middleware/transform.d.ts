import { Middleware } from "./index";
export declare function createTransformMiddleware<TArgs extends any[], TResult>(options: {
    transformArgs?: (args: TArgs) => TArgs | Promise<TArgs>;
    transformResult?: (result: TResult) => TResult | Promise<TResult>;
}): Middleware<TArgs, TResult>;
//# sourceMappingURL=transform.d.ts.map