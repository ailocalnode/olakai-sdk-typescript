export { monitor, addMiddleware, removeMiddleware } from "./src/monitor";
export {
  initClient,
  getConfig,
  getQueueSize,
  clearQueue,
  flushQueue,
} from "./src/client";
export * from "./src/types";

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
} from "./src/middleware";

// Re-export utilities
export {
  validateConfig,
  validateMonitorOptions,
  generateId,
  formatDuration,
  getEnvironment,
  ConfigBuilder,
  createConfig,
  DEFAULT_SANITIZE_PATTERNS,
} from "./src/utils";
