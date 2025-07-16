import type {
  SDKConfig,
  MonitorPayload,
  BatchRequest,
  APIResponse,
  ControlPayload,
  ControlResponse,
} from "./types";
import { initStorage, getStorage } from "./storage/index";
import packageJson from "../package.json";
const subdomain = "staging.app";
const isBatchingEnabled = false;

let config: SDKConfig = {
  apiKey: "",
  apiUrl: `https://${subdomain}.olakai.ai`,
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

let batchQueue: BatchRequest[] = [];
let batchTimer: NodeJS.Timeout | null = null;
let isOnline = true; // Default to online for server environments

// Helper functions to get effective config values with backwards compatibility
function isStorageEnabled(): boolean {
  return config.enableStorage ?? true;
}
//TODO : Not good if it's server stored
function getStorageKey(): string {
  return config.storageKey ?? "olakai-sdk-queue";
}

function getMaxStorageSize(): number {
  return config.maxStorageSize ?? 1000000;
}

// Setup online/offline detection for browser environments
function initOnlineDetection() {
  if (typeof window !== "undefined" && typeof navigator !== "undefined") {
    // Browser environment - use navigator.onLine and window events
    isOnline = navigator.onLine;
    
    window.addEventListener("online", () => {
      isOnline = true;
      processBatchQueue();
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
export function initClient(
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
    config.apiUrl = domainUrl;
  }
  
  // Apply any additional config properties
  if (Object.keys(restConfig).length > 0) {
    config = { ...config, ...restConfig };
  }
  if (!config.apiUrl) {
    throw new Error("[Olakai SDK] API URL is not set");
  }
  if (!config.apiKey) {
    throw new Error("[Olakai SDK] API key is not set");
  }
  config.apiUrl = `${config.apiUrl}/api/monitoring/prompt`;
  if (config.verbose) {
    console.log("[Olakai SDK] Config:", config);
  }
  // Initialize online detection
  initOnlineDetection();
  
  // Initialize storage and load any persisted queue
  const storageType = isStorageEnabled() ? config.storageType : 'disabled';
  const storage = initStorage(storageType, config.cacheDirectory);
  if (isStorageEnabled()) {
    try {
      const stored = storage.getItem(getStorageKey());
      if (stored) {
        const parsedQueue = JSON.parse(stored);
        batchQueue.push(...parsedQueue);
        if (config.debug) {
          console.log(
            `[Olakai SDK] Loaded ${parsedQueue.length} items from storage`,
          );
        }
      }
    } catch (err) {
      if (config.debug) {
        console.warn("[Olakai SDK] Failed to load from storage:", err);
      }
    }
  }

  // Start processing queue if we have items and we're online
  if (batchQueue.length > 0 && isOnline) {
    if (config.verbose) {
      console.log("[Olakai SDK] Starting batch processing");
    }
    processBatchQueue();
  }
}

/**
 * Get the current configuration
 * @returns The current configuration
 */
export function getConfig(): SDKConfig {
  return { ...config };
}

/**
 * Persist the queue to storage
 */
function persistQueue() {
  if (!isStorageEnabled()) return;

  try {
    const storage = getStorage();
    const serialized = JSON.stringify(batchQueue);
    const maxSize = getMaxStorageSize();
    if (serialized.length > maxSize) {
      // Remove oldest items if queue is too large
      const targetSize = Math.floor(maxSize * 0.8);
      while (
        JSON.stringify(batchQueue).length > targetSize &&
        batchQueue.length > 0
      ) {
        batchQueue.shift();
      }
    }
    storage.setItem(getStorageKey(), JSON.stringify(batchQueue));
    if (config.verbose) {
      console.log("[Olakai SDK] Persisted queue to storage");
    }
  } catch (err) {
    if (config.debug) {
      console.warn("[Olakai SDK] Failed to persist queue:", err);
    }
  }
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
    const response = await fetch(config.apiUrl!, {
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
 * Schedule the batch processing
 */
function scheduleBatchProcessing() {
  if (batchTimer) return;

  batchTimer = setTimeout(() => {
    processBatchQueue();
  }, config.batchTimeout);
}

/**
 * The core batching logic
 * Sorts requests by priority (high → normal → low)
 * Groups requests into batches of configurable size
 * Sends batches to the API with retry logic
 * Removes successfully sent items from the queue
 * Schedules the next batch processing
 */
async function processBatchQueue() {
  if (batchTimer) {
    clearTimeout(batchTimer);
    batchTimer = null;
  }

  if (batchQueue.length === 0 || !isOnline) {
    return;
  }

  // Sort by priority: high, normal, low
  batchQueue.sort((a, b) => {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Process batches
  const batches: BatchRequest[][] = [];
  for (let i = 0; i < batchQueue.length; i += config.batchSize!) {
    batches.push(batchQueue.slice(i, i + config.batchSize!));
  }

  const successfulBatches: Set<number> = new Set();

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const payloads = batch.map((item) => item.payload);

    try {
      const success = await sendWithRetry(payloads);
      if (success) {
        successfulBatches.add(batchIndex);
        if (config.verbose) {
          console.log(
            `[Olakai SDK] Successfully sent batch of ${batch.length} items`,
          );
        }
      }
    } catch (err) {
      if (config.debug) {
        console.error(`[Olakai SDK] Batch ${batchIndex} failed:`, err);
      }
    }
  }

  // Remove successfully sent items from queue
  let removeCount = 0;
  for (let i = 0; i < batches.length; i++) {
    if (successfulBatches.has(i)) {
      removeCount += batches[i].length;
    } else {
      break; // Stop at first failed batch to maintain order
    }
  }

  if (removeCount > 0) {
    batchQueue.splice(0, removeCount);
    persistQueue();
  }

  // Schedule next processing if there are still items
  if (batchQueue.length > 0) {
    scheduleBatchProcessing();
  }
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
    const batchItem: BatchRequest = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      payload,
      timestamp: Date.now(),
      retries: 0,
      priority: options.priority || "normal",
    };

    batchQueue.push(batchItem);
    persistQueue();

    // If queue is full or we're in immediate mode, process immediately
    if (batchQueue.length >= config.batchSize! || options.priority === "high") {
      await processBatchQueue();
    } else {
      scheduleBatchProcessing();
    }
  } else {
    await makeAPICall(payload);
  }
}

// Utility functions for management
export function getQueueSize(): number {
  return batchQueue.length;
}

export function clearQueue(): void {
  batchQueue = [];
  if (isStorageEnabled()) {
    const storage = getStorage();
    storage.removeItem(getStorageKey());
    if (config.verbose) {
      console.log("[Olakai SDK] Cleared queue from storage");
    }
  }
}

export async function flushQueue(): Promise<void> {
  if (config.verbose) {
    console.log("[Olakai SDK] Flushing queue");
  }
  await processBatchQueue();
}

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

  const controlEndpoint = endpoint || config.apiUrl!.replace('/monitoring/prompt', '/control/check');
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
