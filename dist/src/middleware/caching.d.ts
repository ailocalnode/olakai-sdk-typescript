import { Middleware } from "./index";
export declare function createCachingMiddleware<TArgs extends any[], TResult>(options: {
    ttlMs?: number;
    keyGenerator: (args: TArgs) => string;
    maxSize?: number;
}): Middleware<TArgs, TResult>;
//# sourceMappingURL=caching.d.ts.map