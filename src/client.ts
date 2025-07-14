import type {
  SDKConfig,
  MonitorPayload,
  BatchRequest,
  APIResponse,
} from "./types";

const subdomain = "staging.app";
const isBatchingEnabled = false;

let config: SDKConfig = {
  apiKey: "",
  apiUrl: `https://${subdomain}.olakai.ai`,
  batchSize: 10,
  batchTimeout: 5000, // 5 seconds
  retries: 3,
  timeout: 20000, // 20 seconds
  enableLocalStorage: true,
  localStorageKey: "olakai-sdk-queue",
  maxLocalStorageSize: 1000000, // 1MB
  debug: false,
  verbose: false,
};

let batchQueue: BatchRequest[] = [];
let batchTimer: NodeJS.Timeout | null = null;
let isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

// Setup online/offline listeners
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    isOnline = true;
    processBatchQueue();
  });
  window.addEventListener("offline", () => {
    isOnline = false;
  });
}
/**
 * Initialize the SDK
 * @param keyOrConfig - The API key or configuration object
 */
export function initClient(
  apiKey?: string,
  domainUrl?: string,
  sdkConfig?: SDKConfig,
) {
  if (apiKey) {
    config.apiKey = apiKey;
  }
  if (domainUrl) {
    config.apiUrl = domainUrl;
  }
  if (sdkConfig) {
    config = { ...config, ...sdkConfig };
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
  // Load any persisted queue from localStorage
  if (config.enableLocalStorage && typeof localStorage !== "undefined") {
    try {
      const stored = localStorage.getItem(config.localStorageKey!);
      if (stored) {
        const parsedQueue = JSON.parse(stored);
        batchQueue.push(...parsedQueue);
        if (config.debug) {
          console.log(
            `[Olakai SDK] Loaded ${parsedQueue.length} items from localStorage`,
          );
        }
      }
    } catch (err) {
      if (config.debug) {
        console.warn("[Olakai SDK] Failed to load from localStorage:", err);
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
 * Persist the queue to localStorage
 */
function persistQueue() {
  if (!config.enableLocalStorage || typeof localStorage === "undefined") return;

  try {
    const serialized = JSON.stringify(batchQueue);
    if (serialized.length > config.maxLocalStorageSize!) {
      // Remove oldest items if queue is too large
      const targetSize = Math.floor(config.maxLocalStorageSize! * 0.8);
      while (
        JSON.stringify(batchQueue).length > targetSize &&
        batchQueue.length > 0
      ) {
        batchQueue.shift();
      }
    }
    localStorage.setItem(config.localStorageKey!, JSON.stringify(batchQueue));
    if (config.verbose) {
      console.log("[Olakai SDK] Persisted queue to localStorage");
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

    const result = await response.json();
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
  if (config.enableLocalStorage && typeof localStorage !== "undefined") {
    localStorage.removeItem(config.localStorageKey!);
    if (config.verbose) {
      console.log("[Olakai SDK] Cleared queue from localStorage");
    }
  }
}

export async function flushQueue(): Promise<void> {
  if (config.verbose) {
    console.log("[Olakai SDK] Flushing queue");
  }
  await processBatchQueue();
}
