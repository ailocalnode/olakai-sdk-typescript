export { initClient } from "./src/client";

// Export simplified helper functions
export {
  olakaiMonitor,
  olakaiReport,
  olakai,
  olakaiConfig,
} from "./src/helpers";
export * from "./src/types";

// Re-export utilities
export { DEFAULT_SANITIZE_PATTERNS } from "./src/utils";

export { OlakaiBlockedError, OlakaiSDKError } from "./src/exceptions";
