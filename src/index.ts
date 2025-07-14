export { monitor, addMiddleware, removeMiddleware } from "./monitor";
export {
  initClient,
  getConfig,
  getQueueSize,
  clearQueue,
  flushQueue,
} from "./client";
export * from "./types";

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
} from "./middleware";

// Re-export utilities
export {
  validateConfig,
  validateMonitorOptions,
  generateId,
  formatDuration,
  getEnvironment,
  isLocalStorageAvailable,
  ConfigBuilder,
  createConfig,
  DEFAULT_SANITIZE_PATTERNS,
} from "./utils";
