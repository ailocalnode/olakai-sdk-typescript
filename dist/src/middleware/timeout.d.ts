import { Middleware } from "./index";
export declare function createTimeoutMiddleware<TArgs extends any[], TResult>(_timeoutMs: number): Middleware<TArgs, TResult>;
export declare function createValidationMiddleware<TArgs extends any[], TResult>(options: {
    validateArgs?: (args: TArgs) => boolean | string;
    validateResult?: (result: TResult) => boolean | string;
}): Middleware<TArgs, TResult>;
//# sourceMappingURL=timeout.d.ts.map