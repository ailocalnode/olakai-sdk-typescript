export {monitor, addMiddleware, removeMiddleware } from "./src/monitor";
export {
  initClient,
  getConfig,
} from "./src/client";

// Export simplified helper functions
export {
  olakaiMonitor as simpleMonitor,
  olakaiAdvancedMonitor as advancedMonitor,
  capture,
} from "./src/helpers";
export * from "./src/types";
export { getQueueSize, clearQueue, flushQueue } from "./src/queue";

// Re-export middleware
export {
  createCommonMiddleware,
  createLoggingMiddleware,
  createRateLimitMiddleware,
  createValidationMiddleware,
  createCachingMiddleware,
  createCircuitBreakerMiddleware,
  createTransformMiddleware,
  createTimeoutMiddleware,
  createCustomMiddleware,
} from "./src/middleware/index";

// Re-export utilities
export {
  validateMonitorOptions,
  DEFAULT_SANITIZE_PATTERNS,
} from "./src/utils";
