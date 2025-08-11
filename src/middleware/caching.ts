import { Middleware } from "./index";

/**
 * Create a caching middleware
 * This middleware caches the results of a function call for a specified time period.
 * It is useful for functions that are called frequently and return the same result for the same input.
 * It is also useful for functions that are called with the same input but return different results.
 * @param options - The options for the middleware
 * @returns A middleware function
 */
export function createCachingMiddleware<TArgs extends any[], TResult>(options: {
    ttlMs?: number;
    keyGenerator: (args: TArgs) => string;
    maxSize?: number;
  }): Middleware<TArgs, TResult> {
    const { ttlMs = 60000, keyGenerator, maxSize = 100 } = options;
    const cache = new Map<string, { value: TResult; expiry: number }>();
  
    return {
      name: "caching",
      beforeCall: async (args: TArgs) => {
        const key = keyGenerator(args);
        const cached = cache.get(key);
  
        if (cached && Date.now() < cached.expiry) {
          // Return cached result by throwing a special "cached result" object
          // This is a hack since we can't modify the control flow easily
          throw { __isCachedResult: true, value: cached.value };
        }
  
        return args;
      },
      afterCall: async (result: TResult, args: TArgs) => {
        const key = keyGenerator(args);
  
        // Implement LRU eviction if cache is full
        if (cache.size >= maxSize) {
          const firstKey = cache.keys().next().value;
          if (firstKey) {
            cache.delete(firstKey);
          }
        }
  
        cache.set(key, {
          value: result,
          expiry: Date.now() + ttlMs,
        });
  
        return result;
      },
    };
  }