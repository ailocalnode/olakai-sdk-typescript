"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTimeoutMiddleware = createTimeoutMiddleware;
exports.createValidationMiddleware = createValidationMiddleware;
// Timeout middleware
function createTimeoutMiddleware(_timeoutMs) {
    return {
        name: "timeout",
        beforeCall: async (args) => {
            // Store timeout info in args metadata (if supported)
            return args;
        },
    };
}
// Validation middleware
function createValidationMiddleware(options) {
    const { validateArgs, validateResult } = options;
    return {
        name: "validation",
        beforeCall: async (args) => {
            if (validateArgs) {
                const validation = validateArgs(args);
                if (validation !== true) {
                    throw new Error(`Argument validation failed: ${validation}`);
                }
            }
            return args;
        },
        afterCall: async (result, _args) => {
            if (validateResult) {
                const validation = validateResult(result);
                if (validation !== true) {
                    throw new Error(`Result validation failed: ${validation}`);
                }
            }
            return result;
        },
    };
}
//# sourceMappingURL=timeout.js.map