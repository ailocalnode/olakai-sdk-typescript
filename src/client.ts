import type {
  SDKConfig,
  MonitorPayload,
  MonitoringAPIResponse,
  ControlPayload,
  ControlAPIResponse,
} from "./types";
import { initStorage, isStorageEnabled } from "./queue/storage/index";
import { initQueueManager, QueueDependencies, addToQueue } from "./queue";
import packageJson from "../package.json";
import { ConfigBuilder, olakaiLogger, sleep } from "./utils";
import { StorageType, ErrorCode } from "./types";
import { APIKeyMissingError, ConfigNotInitializedError, OlakaiFunctionBlocked, URLConfigurationError } from "./exceptions";

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
  olakaiLogger(`Online detection initialized. Status: ${isOnline}`, "info");
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
  configBuilder.monitorEndpoint(`${domainUrl}/api/monitoring/prompt`);
  configBuilder.controlEndpoint(`${domainUrl}/api/control/prompt`);
  configBuilder.enableBatching(options.enableBatching || true);
  configBuilder.batchSize(options.batchSize || 10);
  configBuilder.batchTime(options.batchTime || 5000);
  configBuilder.retries(options.retries || 4);
  configBuilder.timeout(options.timeout || 20000);
  configBuilder.enableStorage(options.enableStorage || true);
  configBuilder.storageKey(options.storageKey || "olakai-sdk-queue");
  configBuilder.maxStorageSize(options.maxStorageSize || 1000000);
  configBuilder.sanitizePatterns(options.sanitizePatterns || []);
  configBuilder.version(options.version || packageJson.version);
  configBuilder.debug(options.debug || false);
  configBuilder.verbose(options.verbose || false);
  configBuilder.storageType(options.storageType || StorageType.AUTO);
  config = configBuilder.build();
  
  // Validate required configuration
  if (!config.monitorEndpoint || config.monitorEndpoint === "/api/monitoring/prompt") {
    throw new URLConfigurationError("[Olakai SDK] API URL is not set. Please provide a valid monitorEndpoint in the configuration.");
  }
  if (!config.controlEndpoint || config.controlEndpoint === "/api/control/prompt") {
    throw new URLConfigurationError("[Olakai SDK] API URL is not set. Please provide a valid controlEndpoint in the configuration.");
  }
  if (!config.apiKey || config.apiKey.trim() === "") {
    throw new APIKeyMissingError("[Olakai SDK] API key is not set. Please provide a valid apiKey in the configuration.");
  }
  olakaiLogger(`Config: ${JSON.stringify(config)}`, "info");
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
  olakaiLogger(`Queue manager initialized successfully`, "info");
}

/**
 * Get the current configuration
 * @returns The current configuration
 */
export function getConfig(): SDKConfig {
  if (!config) {
    throw new ConfigNotInitializedError("[Olakai SDK] Config is not initialized");
  }
  return config;
}

/**
 * Make an API call to the configured endpoint
 * @param payload - The payload to send to the endpoint
 * @returns A promise that resolves to the API response
 */
async function makeAPICall(
  payload: MonitorPayload[] | ControlPayload,
  role: "monitoring" | "control" = "monitoring",
): Promise<MonitoringAPIResponse | ControlAPIResponse> {
  if (!config.apiKey) {
    throw new Error("[Olakai SDK] API key is not set");
  }
  olakaiLogger(`Making API call to ${role} endpoint: ${config.monitorEndpoint}`, "info");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);
  let url: string = "";
  if (role === "monitoring") {
    url = config.monitorEndpoint;
  } else if (role === "control") {
    url = config.controlEndpoint;
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
      },
      body: JSON.stringify(payload),

      signal: controller.signal,
    });
    olakaiLogger(`API call response: ${response.status}`, "info");
    let responseData: MonitoringAPIResponse | ControlAPIResponse = {} as MonitoringAPIResponse | ControlAPIResponse;
    if (role === "monitoring") {
      responseData = await response.json() as MonitoringAPIResponse;
    } else if (role === "control") {
      responseData = await response.json() as ControlAPIResponse;
    }

    olakaiLogger(`API response: ${JSON.stringify(responseData)}`, "info");

    clearTimeout(timeoutId);

    // Handle different status codes for batch operations
    if (role === "monitoring") {
      responseData = responseData as MonitoringAPIResponse;
      if (response.status === ErrorCode.SUCCESS) {
        // All requests succeeded
        olakaiLogger(`All batch requests succeeded: ${JSON.stringify(responseData)}`, "info");
        return responseData;

      } else if (response.status === ErrorCode.PARTIAL_SUCCESS) {
        // Mixed success/failure (Multi-Status)
        olakaiLogger(`Batch requests had mixed results: ${responseData.successCount}/${responseData.totalRequests} succeeded`, "warn");
        return responseData; // Note: overall success=true even for partial failures

      } else if (response.status === ErrorCode.FAILED) {
        // All failed or system error
        olakaiLogger(`All batch requests failed: ${JSON.stringify(responseData)}`, "error");
        throw new Error(`Batch processing failed: ${responseData.message || response.statusText}`);
      } else if (!response.ok) {
        // Other error status codes
        olakaiLogger(`API call failed: ${JSON.stringify(payload)}`, "info");
        olakaiLogger(`Unexpected API response status: ${response.status}`, "warn");
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
      } else {
        // Legacy support for other 2xx status codes
        return responseData;
      }
    } else if (role === "control") {
      responseData = responseData as ControlAPIResponse;
      if (response.status === ErrorCode.SUCCESS) {
        return responseData;
      } else if (!response.ok) {
        // Other error status codes
        olakaiLogger(`Unexpected API response status: ${response.status}`, "warn");
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } else {
        return responseData;
      }
    }
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
  throw new Error("[Olakai SDK] Invalid role");
}

/**
 * Send a payload to the API with retry logic
 * @param payload - The payload to send to the endpoint
 * @param maxRetries - The maximum number of retries
 * @returns A promise that resolves to an object with success status and details about batch results
 */
async function sendWithRetry(
  payload: MonitorPayload[] | ControlPayload,
  maxRetries: number = config.retries!,
  role: "monitoring" | "control" = "monitoring",
): Promise<MonitoringAPIResponse | ControlAPIResponse> {

  let lastError: Error | null = null;
  let response: MonitoringAPIResponse | ControlAPIResponse = {} as MonitoringAPIResponse | ControlAPIResponse;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    
    try {
      if (role === "monitoring") {
      response = await makeAPICall(payload, "monitoring") as MonitoringAPIResponse;
      if (response.success) {
        return response;
      } else if (response.failureCount && response.failureCount > 0) {
          olakaiLogger(
            `Batch partial success: ${response.successCount}/${response.totalRequests} requests succeeded`,
            "info");
            return response;
        }
      } else if (role === "control") {
        response = await makeAPICall(payload, "control") as ControlAPIResponse;
        return response;
      }
    } catch (err) {
      lastError = err as Error;

      olakaiLogger(`Attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError?.message}`, "warn");

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        await sleep(delay);
      }
    }
  }   
  olakaiLogger(`All retry attempts failed: ${JSON.stringify(lastError)}`, "error");
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
  payload: MonitorPayload | ControlPayload,
  role: "monitoring" | "control" = "monitoring",
  options: {
    retries?: number;
    timeout?: number;
    priority?: "low" | "normal" | "high";
  } = {},
) {
  if (!config.apiKey) {
    throw new Error("[Olakai SDK] API key is not set");
  }
  if (role === "monitoring") { 
  if (config.enableBatching) {
    await addToQueue(payload as MonitorPayload, options);
  } else {
    // For non-batching mode, use makeAPICall directly and handle the response
    //legacy support for non-batching mode
    const response = await makeAPICall([payload as MonitorPayload], "monitoring") as MonitoringAPIResponse;

    
    // Log any batch-style response information if present
    if (response.totalRequests !== undefined && response.successCount !== undefined) {
      olakaiLogger(
        `Direct API call result: ${response.successCount}/${response.totalRequests} requests succeeded`,
        response.failureCount && response.failureCount > 0 ? "warn" : "info"
      );
    }
    }
  } else if (role === "control") {
    try {
      const response = await sendWithRetry(payload as ControlPayload, config.retries!, "control") as ControlAPIResponse;
      return response;
    } catch (error) {
      if (error instanceof OlakaiFunctionBlocked) {
        throw error;
      }
      throw error;
    }
  } else {
    throw new Error("[Olakai SDK] Invalid role");
  }
}

// Re-export queue utility functions
export { getQueueSize, clearQueue, flushQueue, getQueueManager } from './queue';
