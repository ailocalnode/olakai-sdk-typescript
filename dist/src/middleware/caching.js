"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCachingMiddleware = createCachingMiddleware;
// Caching middleware
function createCachingMiddleware(options) {
    const { ttlMs = 60000, keyGenerator, maxSize = 100 } = options;
    const cache = new Map();
    return {
        name: "caching",
        beforeCall: async (args) => {
            const key = keyGenerator(args);
            const cached = cache.get(key);
            if (cached && Date.now() < cached.expiry) {
                // Return cached result by throwing a special "cached result" object
                // This is a hack since we can't modify the control flow easily
                throw { __isCachedResult: true, value: cached.value };
            }
            return args;
        },
        afterCall: async (result, args) => {
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
//# sourceMappingURL=caching.js.map