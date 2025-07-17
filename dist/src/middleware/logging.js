"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLoggingMiddleware = createLoggingMiddleware;
// Logging middleware
function createLoggingMiddleware(options) {
    const { level = "info", includeArgs = false, includeResult = false, logger = console, } = options;
    return {
        name: "logging",
        beforeCall: async (args) => {
            if (includeArgs) {
                logger[level]("[Olakai SDK] Calling function with args:", args);
            }
            else {
                logger[level]("[Olakai SDK] Calling function");
            }
            return args;
        },
        afterCall: async (result, _args) => {
            if (includeResult) {
                logger[level]("[Olakai SDK] Function completed with result:", result);
            }
            else {
                logger[level]("[Olakai SDK] Function completed successfully");
            }
            return result;
        },
        onError: async (error, _args) => {
            logger.error("[Olakai SDK] Function failed with error:", error);
        },
    };
}
//# sourceMappingURL=logging.js.map