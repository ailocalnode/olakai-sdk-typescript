import type { APIResponse, BatchRequest, MonitorPayload, SDKConfig } from '../types';
import { olakaiLoggger } from '../utils';
import { getStorage, isStorageEnabled, getStorageKey, getMaxStorageSize } from './storage/index';

/**
 * Dependencies that the queue manager needs from the client
 */
export interface QueueDependencies {
  config: SDKConfig;
  isOnline: () => boolean;
  sendWithRetry: (payload: MonitorPayload[], maxRetries?: number) => Promise<APIResponse>;

}

/**
 * Queue Manager - Handles all queue operations and state
 */
export class QueueManager {
  private batchQueue: BatchRequest[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private clearRetriesTimer: NodeJS.Timeout | null = null;
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

    if (this.batchQueue.length === 0) {
      this.batchQueue.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        payload: [payload],
        timestamp: Date.now(),
        retries: options.retries || 0,
        priority: options.priority || "normal",})
        this.persistQueue();
        this.scheduleBatchProcessing();
        this.scheduleClearRetriesQueue();
        return;
    } else {
      for (let index = this.batchQueue.length - 1; index >= 0; index--) {
        if (this.batchQueue[index].payload.length < this.dependencies.config.batchSize && this.batchQueue[index].retries === (options.retries || 0)) {
          this.batchQueue[index].payload.push(payload);
          if (options.priority === "high") {
            this.batchQueue[index].priority = "high";
          }
          this.persistQueue();
          if (options.priority === "high") {
            await this.processBatchQueue();
          } else {

            this.scheduleBatchProcessing();
          }
          this.scheduleClearRetriesQueue();
          return;
        }
      }
    }

    this.batchQueue.push({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      payload: [payload],
      timestamp: Date.now(),
      retries: options.retries || 0,
      priority: options.priority || "normal",})

    this.persistQueue();
    // If queue is full or we're in immediate mode, process immediately
    if (options.priority === "high") {
      await this.processBatchQueue();
    } else {
      this.scheduleBatchProcessing();
    }
    this.scheduleClearRetriesQueue();
  }
  
  /**
   * Clear the retries queue
   */
  clearRetriesQueue(): void {
    if (this.clearRetriesTimer) {
      clearTimeout(this.clearRetriesTimer);
      this.clearRetriesTimer = null;
    }
    this.batchQueue = this.batchQueue.filter(batch => batch.retries < this.dependencies.config.retries);
    this.persistQueue();
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
   * Schedule the clear retries queue
   */
private scheduleClearRetriesQueue(): void {
  if (this.clearRetriesTimer) return;

  this.clearRetriesTimer = setTimeout(() => {
    this.clearRetriesQueue();
  }, this.dependencies.config.batchTimeout);
}
  /**
   * The core batching logic - simplified for easier maintenance
   * Processes one batch at a time and handles partial failures
   */
  private async processBatchQueue(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Sort by priority: high, normal, low
    this.batchQueue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Process one batch at a time
    const currentBatch = this.batchQueue.shift();
    if (!currentBatch) {
      return;
    }
    this.persistQueue();

    const payloads = currentBatch.payload;

    if (payloads.length === 0) {
      this.scheduleBatchProcessing();
      return;
    }

    try {
      const result = await this.dependencies.sendWithRetry(payloads);
      
      if (result.success) {
        // All succeeded (no detailed results)
        olakaiLoggger(`Batch of ${currentBatch.payload.length} items sent successfully`, "info");
        return;
      } else {
        // Can be partial success failure
        const newBatch: BatchRequest = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          payload: [],
          timestamp: Date.now(),
          retries: currentBatch.retries + 1,
          priority: currentBatch.priority,
        }
        for (const resul of result.results) {
          if (!resul.success) {
            newBatch.payload.push(payloads[resul.index]);
          }
        }
        this.batchQueue.push(newBatch);
        this.persistQueue();
        this.scheduleBatchProcessing();
        return;
      }
    } catch (err) {
      olakaiLoggger(`Batch processing failed: ${JSON.stringify(err)}`, "error");
      for (const payload of payloads) {
        this.addToQueue(payload, {retries: currentBatch.retries + 1, priority: currentBatch.priority});
      }
      this.scheduleBatchProcessing();
      return; 
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