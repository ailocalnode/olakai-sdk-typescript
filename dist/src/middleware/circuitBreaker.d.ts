import { Middleware } from "./index";
export declare function createCircuitBreakerMiddleware<TArgs extends any[], TResult>(options: {
    failureThreshold: number;
    resetTimeoutMs: number;
}): Middleware<TArgs, TResult>;
//# sourceMappingURL=circuitBreaker.d.ts.map