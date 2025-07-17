"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SANITIZE_PATTERNS = exports.validateMonitorOptions = exports.createCustomMiddleware = exports.createTimeoutMiddleware = exports.createTransformMiddleware = exports.createCircuitBreakerMiddleware = exports.createCachingMiddleware = exports.createValidationMiddleware = exports.createRateLimitMiddleware = exports.createLoggingMiddleware = exports.createCommonMiddleware = exports.flushQueue = exports.clearQueue = exports.getQueueSize = exports.capture = exports.olakaiAdvancedMonitor = exports.olakaiMonitor = exports.getConfig = exports.initClient = exports.removeMiddleware = exports.addMiddleware = exports.monitor = void 0;
var monitor_1 = require("./src/monitor");
Object.defineProperty(exports, "monitor", { enumerable: true, get: function () { return monitor_1.monitor; } });
Object.defineProperty(exports, "addMiddleware", { enumerable: true, get: function () { return monitor_1.addMiddleware; } });
Object.defineProperty(exports, "removeMiddleware", { enumerable: true, get: function () { return monitor_1.removeMiddleware; } });
var client_1 = require("./src/client");
Object.defineProperty(exports, "initClient", { enumerable: true, get: function () { return client_1.initClient; } });
Object.defineProperty(exports, "getConfig", { enumerable: true, get: function () { return client_1.getConfig; } });
// Export simplified helper functions
var helpers_1 = require("./src/helpers");
Object.defineProperty(exports, "olakaiMonitor", { enumerable: true, get: function () { return helpers_1.olakaiMonitor; } });
Object.defineProperty(exports, "olakaiAdvancedMonitor", { enumerable: true, get: function () { return helpers_1.olakaiAdvancedMonitor; } });
Object.defineProperty(exports, "capture", { enumerable: true, get: function () { return helpers_1.capture; } });
__exportStar(require("./src/types"), exports);
var queue_1 = require("./src/queue");
Object.defineProperty(exports, "getQueueSize", { enumerable: true, get: function () { return queue_1.getQueueSize; } });
Object.defineProperty(exports, "clearQueue", { enumerable: true, get: function () { return queue_1.clearQueue; } });
Object.defineProperty(exports, "flushQueue", { enumerable: true, get: function () { return queue_1.flushQueue; } });
// Re-export middleware
var index_1 = require("./src/middleware/index");
Object.defineProperty(exports, "createCommonMiddleware", { enumerable: true, get: function () { return index_1.createCommonMiddleware; } });
Object.defineProperty(exports, "createLoggingMiddleware", { enumerable: true, get: function () { return index_1.createLoggingMiddleware; } });
Object.defineProperty(exports, "createRateLimitMiddleware", { enumerable: true, get: function () { return index_1.createRateLimitMiddleware; } });
Object.defineProperty(exports, "createValidationMiddleware", { enumerable: true, get: function () { return index_1.createValidationMiddleware; } });
Object.defineProperty(exports, "createCachingMiddleware", { enumerable: true, get: function () { return index_1.createCachingMiddleware; } });
Object.defineProperty(exports, "createCircuitBreakerMiddleware", { enumerable: true, get: function () { return index_1.createCircuitBreakerMiddleware; } });
Object.defineProperty(exports, "createTransformMiddleware", { enumerable: true, get: function () { return index_1.createTransformMiddleware; } });
Object.defineProperty(exports, "createTimeoutMiddleware", { enumerable: true, get: function () { return index_1.createTimeoutMiddleware; } });
Object.defineProperty(exports, "createCustomMiddleware", { enumerable: true, get: function () { return index_1.createCustomMiddleware; } });
// Re-export utilities
var utils_1 = require("./src/utils");
Object.defineProperty(exports, "validateMonitorOptions", { enumerable: true, get: function () { return utils_1.validateMonitorOptions; } });
Object.defineProperty(exports, "DEFAULT_SANITIZE_PATTERNS", { enumerable: true, get: function () { return utils_1.DEFAULT_SANITIZE_PATTERNS; } });
//# sourceMappingURL=index.js.map