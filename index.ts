export {addMiddleware, removeMiddleware } from "./src/monitor";
export {initClient} from "./src/client";

// Export simplified helper functions
export {
  olakaiSupervisor as olakaiMonitor,
} from "./src/helpers";
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
  createCustomMiddleware,
} from "./src/middleware/index";

// Re-export utilities
export {
  DEFAULT_SANITIZE_PATTERNS,
} from "./src/utils";

export {
  OlakaiBlockedError,
  OlakaiSDKError,
} from "./src/exceptions";