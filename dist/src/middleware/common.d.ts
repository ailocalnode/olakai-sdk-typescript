import { Middleware } from "./index";
export declare function createCommonMiddleware<TArgs extends any[], TResult>(functionName: string, options?: {
    enableLogging?: boolean;
    enableMetrics?: boolean;
    enableRateLimit?: {
        maxCalls: number;
        windowMs: number;
    };
    enableValidation?: {
        validateArgs?: (args: TArgs) => boolean | string;
        validateResult?: (result: TResult) => boolean | string;
    };
    enableCircuitBreaker?: {
        failureThreshold: number;
        resetTimeoutMs: number;
    };
}): Middleware<TArgs, TResult>[];
//# sourceMappingURL=common.d.ts.map