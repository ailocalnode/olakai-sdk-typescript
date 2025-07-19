import type {
  SDKConfig,
  MonitorPayload,
  APIResponse,
  ControlPayload,
  ControlResponse,
} from "./types";
import { initStorage, isStorageEnabled } from "./queue/storage/index";
import { initQueueManager, QueueDependencies, addToQueue } from "./queue";
import packageJson from "../package.json";
import { ConfigBuilder, olakaiLoggger, sleep } from "./utils";
import { StorageType, ErrorCode } from "./types";

const isBatchingEnabled = false;

let config: SDKConfig;

let isOnline = true; // Default to online for server environments


// Setup online/offline detection for browser environments
function initOnlineDetection() {
  if (typeof window !== "undefined" && typeof navigator !== "undefined") {
    // Browser environment - use navigator.onLine and window events
    isOnline = navigator.onLine;
    
    window.addEventListener("online", () => {
      isOnline = true;
      // Queue manager will handle processing when online
    });
    window.addEventListener("offline", () => {
      isOnline = false;
    });
  } else {
    // Server environment - assume always online
    // Could be enhanced with network connectivity checks if needed
    isOnline = true;
  }
  olakaiLoggger(`Online detection initialized. Status: ${isOnline}`, "info");
}

/**
 * Initialize the SDK
 * @param apiKey - The API key
 * @param domainUrl - The domain URL
 * @param options - The extra options for the SDKConfig
 */
export async function initClient(
  apiKey: string,
  domainUrl: string,
  options: Partial<SDKConfig> = {}
) {
  // Extract known parameters
  const configBuilder = new ConfigBuilder();
  configBuilder.apiKey(apiKey);
  configBuilder.domainUrl(`${domainUrl}/api/monitoring/prompt`);
  configBuilder.batchSize(options.batchSize || 10);
  configBuilder.batchTimeout(options.batchTimeout || 5000);
  configBuilder.retries(options.retries || 4);
  configBuilder.timeout(options.timeout || 20000);
  configBuilder.enableStorage(options.enableStorage || true);
  configBuilder.storageKey(options.storageKey || "olakai-sdk-queue");
  configBuilder.maxStorageSize(options.maxStorageSize || 1000000);
  configBuilder.onError(options.onError || (() => {}));
  configBuilder.sanitizePatterns(options.sanitizePatterns || []);
  configBuilder.version(options.version || packageJson.version);
  configBuilder.debug(options.debug || false);
  configBuilder.verbose(options.verbose || false);
  configBuilder.storageType(options.storageType || StorageType.AUTO);
  config = configBuilder.build();
  
  // Validate required configuration
  if (!config.domainUrl || config.domainUrl === "/api/monitoring/prompt") {
    throw new Error("[Olakai SDK] API URL is not set. Please provide a valid domainUrl in the configuration.");
  }
  if (!config.apiKey || config.apiKey.trim() === "") {
    throw new Error("[Olakai SDK] API key is not set. Please provide a valid apiKey in the configuration.");
  }
  olakaiLoggger(`Config: ${JSON.stringify(config)}`, "info");
  // Initialize online detection
  initOnlineDetection();
  
  // Initialize storage
  const storageType = isStorageEnabled(config) ? config.storageType : StorageType.DISABLED;
  initStorage(storageType, config.cacheDirectory);

  // Initialize queue manager with dependencies
  const queueDependencies: QueueDependencies = {
    config,
    isOnline: () => isOnline,
    sendWithRetry: sendWithRetry
  };

  const queueManager = await initQueueManager(queueDependencies);
  olakaiLoggger(`Queue manager initialized successfully`, "info");
}

/**
 * Get the current configuration
 * @returns The current configuration
 */
export function getConfig(): SDKConfig {
  if (!config) {
    throw new Error("[Olakai SDK] Config is not initialized");
  }
  return config;
}

/**
 * Make an API call to the configured endpoint
 * @param payload - The payload to send to the endpoint
 * @returns A promise that resolves to the API response
 */
async function makeAPICall(
  payload: MonitorPayload[],
): Promise<APIResponse> {
  if (!config.apiKey) {
    throw new Error("[Olakai SDK] API key is not set");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);

  try {
    const response = await fetch(config.domainUrl!, {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }) as Response & { response: APIResponse };

    olakaiLoggger(`API response status: ${response.status}`, "info");

    clearTimeout(timeoutId);

    // Handle different status codes for batch operations
    if (response.status === ErrorCode.SUCCESS) {
      // All requests succeeded
      const result = response.response;
      olakaiLoggger(`All batch requests succeeded: ${JSON.stringify(result)}`, "info");
      return result;

    } else if (response.status === ErrorCode.PARTIAL_SUCCESS) {
      // Mixed success/failure (Multi-Status)
      const result = response.response;
      olakaiLoggger(`Batch requests had mixed results: ${result.successCount}/${result.totalRequests} succeeded`, "warn");
      return result; // Note: overall success=true even for partial failures

    } else if (response.status === ErrorCode.FAILED) {
      // All failed or system error
      const result = await response.json();
      olakaiLoggger(`All batch requests failed: ${JSON.stringify(result)}`, "error");
      throw new Error(`Batch processing failed: ${result.message || response.statusText}`);

    } else if (!response.ok) {
      // Other error status codes
      olakaiLoggger(`Unexpected API response status: ${response.status}`, "warn");
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } else {
      // Legacy support for other 2xx status codes
      const result = response.response;
      return result;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Send a payload to the API with retry logic
 * @param payload - The payload to send to the endpoint
 * @param maxRetries - The maximum number of retries
 * @returns A promise that resolves to an object with success status and details about batch results
 */
async function sendWithRetry(
  payload: MonitorPayload[],
  maxRetries: number = config.retries!,
): Promise<APIResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await makeAPICall(payload);
      if (response.success) {
        return response;
      } else if (response.failureCount && response.failureCount > 0) {
          olakaiLoggger(
            `Batch partial success: ${response.successCount}/${response.totalRequests} requests succeeded`,
            "info");
            return response;
        }
      
    } catch (err) {
      lastError = err as Error;

      olakaiLoggger(`Attempt ${attempt + 1}/${maxRetries + 1} failed: ${JSON.stringify(err)}`, "warn");

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        await sleep(config, delay);
      }
    }
  }

  if (config.onError && lastError) {
    config.onError(lastError);
  }
  
  olakaiLoggger(`All retry attempts failed: ${JSON.stringify(lastError)}`, "error");
  throw lastError;
}

/**
 * Send a payload to the API
 * Adds the payload to the queue and processes it
 * Persists queue to localStorage (for offline support)
 * Schedules batch processing for normal requests
 * Processes immediately for high priority requests
 * @param payload - The payload to send to the endpoint
 * @param options - The options for the API call
 * @returns A promise that resolves when the payload is sent
 */
export async function sendToAPI(
  payload: MonitorPayload,
  options: {
    retries?: number;
    timeout?: number;
    priority?: "low" | "normal" | "high";
  } = {},
) {
  if (!config.apiKey) {
    throw new Error("[Olakai SDK] API key is not set");
  }

  if (isBatchingEnabled) {
    await addToQueue(payload, options);
  } else {
    // For non-batching mode, use makeAPICall directly and handle the response
    const response = await makeAPICall([payload]);
    
    // Log any batch-style response information if present
    if (response.totalRequests && response.successCount !== undefined) {
      olakaiLoggger(
        `Direct API call result: ${response.successCount}/${response.totalRequests} requests succeeded`,
        response.failureCount && response.failureCount > 0 ? "warn" : "info"
      );
    }
  }
}

// Re-export queue utility functions
export { getQueueSize, clearQueue, flushQueue, getQueueManager } from './queue';


/**
 * Make a control API call to check if execution should be allowed
 * @param payload - The control payload to send
 * @param endpoint - Optional custom endpoint for control checks
 * @param timeout - Custom timeout for this request
 * @returns A promise that resolves to the control response
 */
async function makeControlAPICall(
  payload: ControlPayload,
  endpoint?: string,
  timeout?: number,
): Promise<ControlResponse> {
  if (!config.apiKey) {
    throw new Error("[Olakai SDK] API key is not set");
  }

  const controlEndpoint = endpoint || config.domainUrl!.replace('/monitoring/prompt', '/control/check');
  const requestTimeout = timeout || config.timeout;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

  try {
    const response = await fetch(controlEndpoint, {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    olakaiLoggger(`Control API response: ${JSON.stringify(response)}`, "info");

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json() as any;
    
    // Ensure the response has the expected structure
    if (typeof result.allowed !== 'boolean') {
      throw new Error("Invalid control response: missing 'allowed' field");
    }
    
    return result as ControlResponse;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Send a payload to the control API with retry logic
 * @param payload - The control payload to send
 * @param options - The options for the control API call
 * @returns A promise that resolves to the control response
 */
export async function sendToControlAPI(
  payload: ControlPayload,
  options: {
    endpoint?: string;
    retries?: number;
    timeout?: number;
    priority?: "low" | "normal" | "high";
  } = {},
): Promise<ControlResponse> {
  if (!config.apiKey) {
    throw new Error("[Olakai SDK] API key is not set");
  }

  const maxRetries = options.retries ?? config.retries!;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await makeControlAPICall(payload, options.endpoint, options.timeout);
      return response;
    } catch (err) {
      lastError = err as Error;

      if (config.debug) {
        console.warn(
          `[Olakai SDK] Control API attempt ${attempt + 1}/${maxRetries + 1} failed:`,
          err,
        );
      }

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        await sleep(config, delay);
      }
    }
  }

  if (config.onError && lastError) {
    config.onError(lastError);
  }

  if (config.debug) {
    console.error("[Olakai SDK] All control API retry attempts failed:", lastError);
  }

  throw lastError;
}
