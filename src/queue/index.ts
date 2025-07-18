import type { BatchRequest, MonitorPayload, SDKConfig } from '../types';
import { olakaiLoggger } from '../utils';
import { getStorage, isStorageEnabled, getStorageKey, getMaxStorageSize } from './storage/index';

/**
 * Dependencies that the queue manager needs from the client
 */
export interface QueueDependencies {
  config: SDKConfig;
  isOnline: () => boolean;
  sendWithRetry: (payload: MonitorPayload | MonitorPayload[], maxRetries?: number) => Promise<{ success: boolean; response?: any; error?: Error }>;
}

/**
 * Queue Manager - Handles all queue operations and state
 */
export class QueueManager {
  private batchQueue: BatchRequest[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private dependencies: QueueDependencies;

  constructor(dependencies: QueueDependencies) {
    this.dependencies = dependencies
  }

  /**
   * Initialize the queue by loading persisted data
   */
  async initialize(): Promise<void> {
    if (isStorageEnabled(this.dependencies.config)) {
      try {
        const storage = getStorage();
        const stored = storage.getItem(getStorageKey(this.dependencies.config));
        if (stored) {
          const parsedQueue = JSON.parse(stored);
          this.batchQueue.push(...parsedQueue);
          olakaiLoggger(`Loaded ${parsedQueue.length} items from storage`, "info");
        }
      } catch (err) {
        olakaiLoggger(`Failed to load from storage: ${JSON.stringify(err)}`, "warn");
      }
    }

    // Start processing queue if we have items and we're online
    if (this.batchQueue.length > 0 && this.dependencies.isOnline()) {
      olakaiLoggger(`Starting batch processing`, "info");
      await this.processBatchQueue();
    }
  }

  /**
   * Add an item to the queue
   */
  async addToQueue(
    payload: MonitorPayload,
    options: {
      retries?: number;
      timeout?: number;
      priority?: "low" | "normal" | "high";
    } = {}
  ): Promise<void> {
    const batchItem: BatchRequest = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      payload,
      timestamp: Date.now(),
      retries: 0,
      priority: options.priority || "normal",
    };

    this.batchQueue.push(batchItem);
    this.persistQueue();

    // If queue is full or we're in immediate mode, process immediately
    if (this.batchQueue.length >= this.dependencies.config.batchSize || options.priority === "high") {
      await this.processBatchQueue();
    } else {
      this.scheduleBatchProcessing();
    }
  }

  /**
   * Get the current queue size
   */
  getSize(): number {
    return this.batchQueue.length;
  }

  /**
   * Clear the queue without sending
   */
  clear(): void {
    this.batchQueue = [];
    if (isStorageEnabled(this.dependencies.config)) {
      const storage = getStorage();
      storage.removeItem(getStorageKey(this.dependencies.config));
      olakaiLoggger(`Cleared queue from storage`, "info");
    }
  }

  /**
   * Flush the queue (send all pending items)
   */
  async flush(): Promise<void> {
    olakaiLoggger(`Flushing queue`, "info");
    await this.processBatchQueue();
  }

  /**
   * Persist the queue to storage
   */
  private persistQueue(): void {
    if (!isStorageEnabled(this.dependencies.config)) return;

    try {
      const storage = getStorage();
      const serialized = JSON.stringify(this.batchQueue);
      const maxSize = getMaxStorageSize(this.dependencies.config);
      if (serialized.length > maxSize) {
        // Remove oldest items if queue is too large
        const targetSize = Math.floor(maxSize * 0.8);
        while (
          JSON.stringify(this.batchQueue).length > targetSize &&
          this.batchQueue.length > 0
        ) {
          this.batchQueue.shift();
        }
      }
      storage.setItem(getStorageKey(this.dependencies.config), JSON.stringify(this.batchQueue));
      olakaiLoggger(`Persisted queue to storage`, "info");
    } catch (err) {
      olakaiLoggger(`Failed to persist queue: ${JSON.stringify(err)}`, "warn");
    }
  }

  /**
   * Schedule the batch processing
   */
  private scheduleBatchProcessing(): void {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.processBatchQueue();
    }, this.dependencies.config.batchTimeout);
  }

  /**
   * The core batching logic
   * Sorts requests by priority (high → normal → low)
   * Groups requests into batches of configurable size
   * Sends batches to the API with retry logic
   * Removes successfully sent items from the queue
   * Schedules the next batch processing
   */
  private async processBatchQueue(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.batchQueue.length === 0 || !this.dependencies.isOnline()) {
      return;
    }

    // Sort by priority: high, normal, low
    this.batchQueue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Process batches
    const batches: BatchRequest[][] = [];
    for (let i = 0; i < this.batchQueue.length; i += this.dependencies.config.batchSize) {
      batches.push(this.batchQueue.slice(i, i + this.dependencies.config.batchSize));
    }

    const successfulBatches: Set<number> = new Set();

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const payloads = batch.map((item) => item.payload);

      try {
        const result = await this.dependencies.sendWithRetry(payloads);
        if (result.success) {
          successfulBatches.add(batchIndex);
          
          // Log detailed batch results if available
          if (result.response?.totalRequests && result.response?.successCount !== undefined) {
            const { totalRequests, successCount, failureCount } = result.response;
            olakaiLoggger(`Batch sent: ${successCount}/${totalRequests} requests succeeded`, "info");
            
            // If we have partial failures, we might want to handle failed items differently in the future
            if (failureCount && failureCount > 0) {
              olakaiLoggger(`Batch ${batchIndex} had ${failureCount} failed requests`, "warn");
            }
          } else {
            olakaiLoggger(`Successfully sent batch of ${batch.length} items`, "info");
          }
        } else {
          olakaiLoggger(`Batch ${batchIndex} failed: ${JSON.stringify(result.error)}`, "warn");
        }
      } catch (err) {
        if (this.dependencies.config.debug) {
          console.error(`[Olakai SDK] Batch ${batchIndex} failed with exception:`, err);
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
      this.batchQueue.splice(0, removeCount);
      this.persistQueue();
    }

    // Schedule next processing if there are still items
    if (this.batchQueue.length > 0) {
      this.scheduleBatchProcessing();
    }
  }
}

// Global queue manager instance
let queueManager: QueueManager | null = null;

/**
 * Initialize the queue manager
 */
export async function initQueueManager(dependencies: QueueDependencies): Promise<QueueManager> {
  if (queueManager) {
    olakaiLoggger(`Queue manager already initialized, replacing with new instance`, "warn");
  }
  
  queueManager = new QueueManager(dependencies);
  await queueManager.initialize();
  
  olakaiLoggger(`Queue manager initialized with ${queueManager.getSize()} items in queue`, "info");
  
  return queueManager;
}

/**
 * Get the current queue manager instance
 */
export function getQueueManager(): QueueManager {
  if (!queueManager) {
    throw new Error('[Olakai SDK] Queue manager not initialized. Call initQueueManager first.');
  }
  return queueManager;
}

// Public API functions that delegate to the queue manager
export function getQueueSize(): number {
  return getQueueManager().getSize();
}

export function clearQueue(): void {
  return getQueueManager().clear();
}

export async function flushQueue(): Promise<void> {
  return getQueueManager().flush();
}

export async function addToQueue(
  payload: MonitorPayload,
  options: {
    retries?: number;
    timeout?: number;
    priority?: "low" | "normal" | "high";
  } = {}
): Promise<void> {
  return getQueueManager().addToQueue(payload, options);
} 