"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = void 0;
exports.initQueueManager = initQueueManager;
exports.getQueueManager = getQueueManager;
exports.getQueueSize = getQueueSize;
exports.clearQueue = clearQueue;
exports.flushQueue = flushQueue;
exports.addToQueue = addToQueue;
const utils_1 = require("../utils");
const index_1 = require("./storage/index");
/**
 * Queue Manager - Handles all queue operations and state
 */
class QueueManager {
    batchQueue = [];
    batchTimer = null;
    clearRetriesTimer = null;
    dependencies;
    constructor(dependencies) {
        this.dependencies = dependencies;
    }
    /**
     * Initialize the queue by loading persisted data
     */
    async initialize() {
        if ((0, index_1.isStorageEnabled)(this.dependencies.config)) {
            try {
                const storage = (0, index_1.getStorage)();
                const stored = storage.getItem((0, index_1.getStorageKey)(this.dependencies.config));
                if (stored) {
                    const parsedQueue = JSON.parse(stored);
                    this.batchQueue.push(...parsedQueue);
                    (0, utils_1.olakaiLoggger)(`Loaded ${parsedQueue.length} items from storage`, "info");
                }
            }
            catch (err) {
                (0, utils_1.olakaiLoggger)(`Failed to load from storage: ${JSON.stringify(err)}`, "warn");
            }
        }
        // Start processing queue if we have items and we're online
        if (this.batchQueue.length > 0 && this.dependencies.isOnline()) {
            (0, utils_1.olakaiLoggger)(`Starting batch processing`, "info");
            await this.processBatchQueue();
        }
    }
    /**
     * Add an item to the queue
     */
    async addToQueue(payload, options = {}) {
        if (this.batchQueue.length === 0) {
            this.batchQueue.push({
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                payload: [payload],
                timestamp: Date.now(),
                retries: options.retries || 0,
                priority: options.priority || "normal",
            });
        }
        else {
            for (let index = this.batchQueue.length - 1; index >= 0; index--) {
                if (this.batchQueue[index].payload.length < this.dependencies.config.batchSize && this.batchQueue[index].retries === (options.retries || 0)) {
                    this.batchQueue[index].payload.push(payload);
                    if (options.priority === "high") {
                        this.batchQueue[index].priority = "high";
                    }
                    this.persistQueue();
                    if (options.priority === "high") {
                        await this.processBatchQueue();
                    }
                    else {
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
            priority: options.priority || "normal",
        });
        this.persistQueue();
        // If queue is full or we're in immediate mode, process immediately
        if (options.priority === "high") {
            await this.processBatchQueue();
        }
        else {
            this.scheduleBatchProcessing();
        }
        this.scheduleClearRetriesQueue();
    }
    /**
     * Clear the retries queue
     */
    clearRetriesQueue() {
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
    getSize() {
        return this.batchQueue.length;
    }
    /**
     * Clear the queue without sending
     */
    clear() {
        this.batchQueue = [];
        if ((0, index_1.isStorageEnabled)(this.dependencies.config)) {
            const storage = (0, index_1.getStorage)();
            storage.removeItem((0, index_1.getStorageKey)(this.dependencies.config));
            (0, utils_1.olakaiLoggger)(`Cleared queue from storage`, "info");
        }
    }
    /**
     * Flush the queue (send all pending items)
     */
    async flush() {
        (0, utils_1.olakaiLoggger)(`Flushing queue`, "info");
        await this.processBatchQueue();
    }
    /**
     * Persist the queue to storage
     */
    persistQueue() {
        if (!(0, index_1.isStorageEnabled)(this.dependencies.config))
            return;
        try {
            const storage = (0, index_1.getStorage)();
            const serialized = JSON.stringify(this.batchQueue);
            const maxSize = (0, index_1.getMaxStorageSize)(this.dependencies.config);
            if (serialized.length > maxSize) {
                // Remove oldest items if queue is too large
                const targetSize = Math.floor(maxSize * 0.8);
                while (JSON.stringify(this.batchQueue).length > targetSize &&
                    this.batchQueue.length > 0) {
                    this.batchQueue.shift();
                }
            }
            storage.setItem((0, index_1.getStorageKey)(this.dependencies.config), JSON.stringify(this.batchQueue));
            (0, utils_1.olakaiLoggger)(`Persisted queue to storage`, "info");
        }
        catch (err) {
            (0, utils_1.olakaiLoggger)(`Failed to persist queue: ${JSON.stringify(err)}`, "warn");
        }
    }
    /**
     * Schedule the batch processing
     */
    scheduleBatchProcessing() {
        if (this.batchTimer)
            return;
        this.batchTimer = setTimeout(() => {
            this.processBatchQueue();
        }, this.dependencies.config.batchTimeout);
    }
    /**
     * Schedule the clear retries queue
     */
    scheduleClearRetriesQueue() {
        if (this.clearRetriesTimer)
            return;
        this.clearRetriesTimer = setTimeout(() => {
            this.clearRetriesQueue();
        }, this.dependencies.config.batchTimeout);
    }
    /**
     * The core batching logic - simplified for easier maintenance
     * Processes one batch at a time and handles partial failures
     */
    async processBatchQueue() {
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
            this.scheduleBatchProcessing();
            return;
        }
        const payloads = currentBatch.payload;
        if (payloads.length === 0) {
            this.scheduleBatchProcessing();
            return;
        }
        try {
            const result = await this.dependencies.sendWithRetry(payloads);
            if (result.success) {
                // All succeeded (no detailed results)
                (0, utils_1.olakaiLoggger)(`Batch of ${currentBatch.payload.length} items sent successfully`, "info");
                return;
            }
            else {
                // Can be partial success failure
                const newBatch = {
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    payload: [],
                    timestamp: Date.now(),
                    retries: currentBatch.retries + 1,
                    priority: currentBatch.priority,
                };
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
        }
        catch (err) {
            (0, utils_1.olakaiLoggger)(`Batch processing failed: ${JSON.stringify(err)}`, "error");
            for (const payload of payloads) {
                this.addToQueue(payload, { retries: currentBatch.retries + 1, priority: currentBatch.priority });
            }
            this.scheduleBatchProcessing();
            return;
        }
    }
}
exports.QueueManager = QueueManager;
// Global queue manager instance
let queueManager = null;
/**
 * Initialize the queue manager
 */
async function initQueueManager(dependencies) {
    if (queueManager) {
        (0, utils_1.olakaiLoggger)(`Queue manager already initialized, replacing with new instance`, "warn");
    }
    queueManager = new QueueManager(dependencies);
    await queueManager.initialize();
    (0, utils_1.olakaiLoggger)(`Queue manager initialized with ${queueManager.getSize()} items in queue`, "info");
    return queueManager;
}
/**
 * Get the current queue manager instance
 */
function getQueueManager() {
    if (!queueManager) {
        throw new Error('[Olakai SDK] Queue manager not initialized. Call initQueueManager first.');
    }
    return queueManager;
}
// Public API functions that delegate to the queue manager
function getQueueSize() {
    return getQueueManager().getSize();
}
function clearQueue() {
    return getQueueManager().clear();
}
async function flushQueue() {
    return getQueueManager().flush();
}
async function addToQueue(payload, options = {}) {
    return getQueueManager().addToQueue(payload, options);
}
//# sourceMappingURL=index.js.map