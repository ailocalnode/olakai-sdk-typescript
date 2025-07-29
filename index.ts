export {monitor, addMiddleware, removeMiddleware } from "./src/monitor";
export {
  initClient,
  getConfig,
} from "./src/client";

// Export simplified helper functions
export {
  olakaiMonitor,
  olakaiAdvancedMonitor,
  capture,
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
  OlakaiFunctionBlocked,
  OlakaiFirewallBlocked,
  OlakaiPersonaBlocked,
  OlakaiSDKError,
} from "./src/exceptions";