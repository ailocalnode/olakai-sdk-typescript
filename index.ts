// New simplified SDK (recommended)
export { OlakaiSDK } from "./src/sdk";

// Provider exports for extensibility
export { BaseLLMProvider, OpenAIProvider } from "./src/providers";

// Vercel AI SDK integration
export { VercelAIIntegration } from "./src/integrations/vercel-ai";

// Legacy exports (deprecated - for backwards compatibility)
export { initClient } from "./src/client";
export {
  olakaiMonitor,
  olakaiReport,
  olakai,
  olakaiConfig,
} from "./src/helpers";

// Type exports
export * from "./src/types";

// Utility exports
export { DEFAULT_SANITIZE_PATTERNS } from "./src/utils";

// Exception exports
export { OlakaiBlockedError, OlakaiSDKError } from "./src/exceptions";
