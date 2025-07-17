import { Middleware } from "./index";
export declare function createRateLimitMiddleware<TArgs extends any[], TResult>(options: {
    maxCalls: number;
    windowMs: number;
    keyGenerator?: (args: TArgs) => string;
}): Middleware<TArgs, TResult>;
//# sourceMappingURL=rateLimiter.d.ts.map