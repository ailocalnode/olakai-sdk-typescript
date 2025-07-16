import type {
  SDKConfig,
  MonitorPayload,
  APIResponse,
  ControlPayload,
  ControlResponse,
} from "./types";
import { initStorage, isStorageEnabled } from "./queue/storage/index";
import { initQueueManager, QueueDependencies } from "./queue";
import packageJson from "../package.json";
const subdomain = "staging.app";
const isBatchingEnabled = false;

let config: SDKConfig = {
  apiKey: "",
  domainUrl: `https://${subdomain}.olakai.ai`,
  batchSize: 10,
  batchTimeout: 5000, // 5 seconds
  retries: 3,
  timeout: 20000, // 20 seconds
  enableStorage: true, // Whether to enable storage at all
  storageType: 'auto', // Auto-detect best storage type
  storageKey: "olakai-sdk-queue", // Storage key/identifier
  maxStorageSize: 1000000, // Maximum storage size (1MB)
  onError: (_error: Error) => {},
  sanitizePatterns: [],
  version: packageJson.version,
  debug: false,
  verbose: false,
};

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
}

/**
 * Initialize the SDK
 * @param keyOrConfig - The API key or configuration object
 */
export async function initClient(
  options: Partial<SDKConfig & {
    apiKey?: string;
    domainUrl?: string;
    [key: string]: any;
  }> = {}
) {
  // Extract known parameters
  const { apiKey, domainUrl, ...restConfig } = options;
  
  // Apply configuration in order of precedence
  if (apiKey) {
    config.apiKey = apiKey;
  }
  if (domainUrl) {
    config.domainUrl = `${domainUrl}/api/monitoring/prompt`;
  }
  
  // Apply any additional config properties
  if (Object.keys(restConfig).length > 0) {
    config = { ...config, ...restConfig };
  }
  if (!config.domainUrl) {
    throw new Error("[Olakai SDK] API URL is not set");
  }
  if (!config.apiKey) {
    throw new Error("[Olakai SDK] API key is not set");
  }
  if (config.verbose) {
    console.log("[Olakai SDK] Config:", config);
  }
  // Initialize online detection
  initOnlineDetection();
  
  // Initialize storage
  const storageType = isStorageEnabled(config) ? config.storageType : 'disabled';
  initStorage(storageType, config.cacheDirectory);

  // Initialize queue manager with dependencies
  const queueDependencies: QueueDependencies = {
    config,
    isOnline: () => isOnline,
    sendWithRetry: sendWithRetry
  };

  const queueManager = initQueueManager(queueDependencies);
  await queueManager.initialize();
}

/**
 * Get the current configuration
 * @returns The current configuration
 */
export function getConfig(): SDKConfig {
  return { ...config };
}

/**
 * Sleep for a given number of milliseconds
 * @param ms - The number of milliseconds to sleep
 * @returns A promise that resolves after the given number of milliseconds
 */
async function sleep(ms: number): Promise<void> {
  if (config.verbose) {
    console.log("[Olakai SDK] Sleeping for", ms, "ms");
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make an API call to the configured endpoint
 * @param payload - The payload to send to the endpoint
 * @returns A promise that resolves to the API response
 */
async function makeAPICall(
  payload: MonitorPayload | MonitorPayload[],
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
      body: JSON.stringify(
        Array.isArray(payload) ? { batch: payload } : payload,
      ),
      signal: controller.signal,
    });

    if (config.verbose) {
      console.log("[Olakai SDK] API response:", response);
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json() as Record<string, any>;
    return { success: true, ...result };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Send a payload to the API with retry logic
 * @param payload - The payload to send to the endpoint
 * @param maxRetries - The maximum number of retries
 * @returns A promise that resolves to true if the payload was sent successfully, false otherwise
 */
async function sendWithRetry(
  payload: MonitorPayload | MonitorPayload[],
  maxRetries: number = config.retries!,
): Promise<boolean> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await makeAPICall(payload);
      return true;
    } catch (err) {
      lastError = err as Error;

      if (config.debug) {
        console.warn(
          `[Olakai SDK] Attempt ${attempt + 1}/${maxRetries + 1} failed:`,
          err,
        );
      }

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        await sleep(delay);
      }
    }
  }

  if (config.onError && lastError) {
    config.onError(lastError);
  }

  if (config.debug) {
    console.error("[Olakai SDK] All retry attempts failed:", lastError);
  }

  return false;
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
    if (config.debug) {
      console.warn("[Olakai SDK] API key is not set.");
    }
    return;
  }

  if (isBatchingEnabled) {
    const { addToQueue } = await import('./queue');
    await addToQueue(payload, options);
  } else {
    await makeAPICall(payload);
  }
}

// Re-export queue utility functions


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

    if (config.verbose) {
      console.log("[Olakai SDK] Control API response:", response);
    }

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
        await sleep(delay);
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
