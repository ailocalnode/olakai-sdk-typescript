import type { APIResponse, MonitorPayload, SDKConfig } from '../types';
/**
 * Dependencies that the queue manager needs from the client
 */
export interface QueueDependencies {
    config: SDKConfig;
    isOnline: () => boolean;
    sendWithRetry: (payload: MonitorPayload | MonitorPayload[], maxRetries?: number) => Promise<APIResponse>;
}
/**
 * Queue Manager - Handles all queue operations and state
 */
export declare class QueueManager {
    private batchQueue;
    private batchTimer;
    private clearRetriesTimer;
    private dependencies;
    constructor(dependencies: QueueDependencies);
    /**
     * Initialize the queue by loading persisted data
     */
    initialize(): Promise<void>;
    /**
     * Add an item to the queue
     */
    addToQueue(payload: MonitorPayload, options?: {
        retries?: number;
        timeout?: number;
        priority?: "low" | "normal" | "high";
    }): Promise<void>;
    /**
     * Clear the retries queue
     */
    clearRetriesQueue(): void;
    /**
     * Get the current queue size
     */
    getSize(): number;
    /**
     * Clear the queue without sending
     */
    clear(): void;
    /**
     * Flush the queue (send all pending items)
     */
    flush(): Promise<void>;
    /**
     * Persist the queue to storage
     */
    private persistQueue;
    /**
     * Schedule the batch processing
     */
    private scheduleBatchProcessing;
    /**
     * Schedule the clear retries queue
     */
    private scheduleClearRetriesQueue;
    /**
     * The core batching logic - simplified for easier maintenance
     * Processes one batch at a time and handles partial failures
     */
    private processBatchQueue;
}
/**
 * Initialize the queue manager
 */
export declare function initQueueManager(dependencies: QueueDependencies): Promise<QueueManager>;
/**
 * Get the current queue manager instance
 */
export declare function getQueueManager(): QueueManager;
export declare function getQueueSize(): number;
export declare function clearQueue(): void;
export declare function flushQueue(): Promise<void>;
export declare function addToQueue(payload: MonitorPayload, options?: {
    retries?: number;
    timeout?: number;
    priority?: "low" | "normal" | "high";
}): Promise<void>;
//# sourceMappingURL=index.d.ts.map