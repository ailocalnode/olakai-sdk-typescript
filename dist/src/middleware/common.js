"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCommonMiddleware = createCommonMiddleware;
const logging_1 = require("./logging");
const rateLimiter_1 = require("./rateLimiter");
const timeout_1 = require("./timeout");
const circuitBreaker_1 = require("./circuitBreaker");
// Export a function to create a common middleware stack
function createCommonMiddleware(functionName, options = {}) {
    const middlewares = [];
    if (options.enableLogging) {
        middlewares.push((0, logging_1.createLoggingMiddleware)({}));
    }
    if (options.enableRateLimit) {
        middlewares.push((0, rateLimiter_1.createRateLimitMiddleware)(options.enableRateLimit));
    }
    if (options.enableValidation) {
        middlewares.push((0, timeout_1.createValidationMiddleware)(options.enableValidation));
    }
    if (options.enableCircuitBreaker) {
        middlewares.push((0, circuitBreaker_1.createCircuitBreakerMiddleware)(options.enableCircuitBreaker));
    }
    return middlewares;
}
//# sourceMappingURL=common.js.map