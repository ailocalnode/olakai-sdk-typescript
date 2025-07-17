"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimitMiddleware = createRateLimitMiddleware;
// Rate limiting middleware
function createRateLimitMiddleware(options) {
    const { maxCalls, windowMs, keyGenerator = () => "default" } = options;
    const callCounts = new Map();
    return {
        name: "rateLimit",
        beforeCall: async (args) => {
            const key = keyGenerator(args);
            const now = Date.now();
            const record = callCounts.get(key);
            if (!record || now > record.resetTime) {
                callCounts.set(key, { count: 1, resetTime: now + windowMs });
            }
            else {
                record.count++;
                if (record.count > maxCalls) {
                    throw new Error(`Rate limit exceeded: ${maxCalls} calls per ${windowMs}ms`);
                }
            }
            return args;
        },
    };
}
//# sourceMappingURL=rateLimiter.js.map