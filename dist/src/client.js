"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQueueManager = exports.flushQueue = exports.clearQueue = exports.getQueueSize = void 0;
exports.initClient = initClient;
exports.getConfig = getConfig;
exports.sendToAPI = sendToAPI;
exports.sendToControlAPI = sendToControlAPI;
const index_1 = require("./queue/storage/index");
const queue_1 = require("./queue");
const package_json_1 = __importDefault(require("../package.json"));
const utils_1 = require("./utils");
const types_1 = require("./types");
const isBatchingEnabled = false;
let config;
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
    }
    else {
        // Server environment - assume always online
        // Could be enhanced with network connectivity checks if needed
        isOnline = true;
    }
    (0, utils_1.olakaiLoggger)(`Online detection initialized. Status: ${isOnline}`, "info");
}
/**
 * Initialize the SDK
 * @param apiKey - The API key
 * @param domainUrl - The domain URL
 * @param options - The extra options for the SDKConfig
 */
async function initClient(apiKey, domainUrl, options = {}) {
    // Extract known parameters
    const configBuilder = new utils_1.ConfigBuilder();
    configBuilder.apiKey(apiKey);
    configBuilder.domainUrl(`${domainUrl}/api/monitoring/prompt`);
    configBuilder.batchSize(options.batchSize || 10);
    configBuilder.batchTimeout(options.batchTimeout || 5000);
    configBuilder.retries(options.retries || 4);
    configBuilder.timeout(options.timeout || 20000);
    configBuilder.enableStorage(options.enableStorage || true);
    configBuilder.storageKey(options.storageKey || "olakai-sdk-queue");
    configBuilder.maxStorageSize(options.maxStorageSize || 1000000);
    configBuilder.onError(options.onError || (() => { }));
    configBuilder.sanitizePatterns(options.sanitizePatterns || []);
    configBuilder.version(options.version || package_json_1.default.version);
    configBuilder.debug(options.debug || false);
    configBuilder.verbose(options.verbose || false);
    configBuilder.storageType(options.storageType || types_1.StorageType.AUTO);
    config = configBuilder.build();
    // Validate required configuration
    if (!config.domainUrl || config.domainUrl === "/api/monitoring/prompt") {
        throw new Error("[Olakai SDK] API URL is not set. Please provide a valid domainUrl in the configuration.");
    }
    if (!config.apiKey || config.apiKey.trim() === "") {
        throw new Error("[Olakai SDK] API key is not set. Please provide a valid apiKey in the configuration.");
    }
    (0, utils_1.olakaiLoggger)(`Config: ${JSON.stringify(config)}`, "info");
    // Initialize online detection
    initOnlineDetection();
    // Initialize storage
    const storageType = (0, index_1.isStorageEnabled)(config) ? config.storageType : types_1.StorageType.DISABLED;
    (0, index_1.initStorage)(storageType, config.cacheDirectory);
    // Initialize queue manager with dependencies
    const queueDependencies = {
        config,
        isOnline: () => isOnline,
        sendWithRetry: sendWithRetry
    };
    const queueManager = await (0, queue_1.initQueueManager)(queueDependencies);
    (0, utils_1.olakaiLoggger)(`Queue manager initialized successfully`, "info");
}
/**
 * Get the current configuration
 * @returns The current configuration
 */
function getConfig() {
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
async function makeAPICall(payload) {
    if (!config.apiKey) {
        throw new Error("[Olakai SDK] API key is not set");
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);
    try {
        const response = await fetch(config.domainUrl, {
            method: "POST",
            headers: {
                "x-api-key": config.apiKey,
            },
            body: JSON.stringify(Array.isArray(payload) ? payload : [payload]),
            signal: controller.signal,
        });
        (0, utils_1.olakaiLoggger)(`API response status: ${response.status}`, "info");
        clearTimeout(timeoutId);
        // Handle different status codes for batch operations
        if (response.status === types_1.ErrorCode.SUCCESS) {
            // All requests succeeded
            const result = response.response;
            (0, utils_1.olakaiLoggger)(`All batch requests succeeded: ${JSON.stringify(result)}`, "info");
            return result;
        }
        else if (response.status === types_1.ErrorCode.PARTIAL_SUCCESS) {
            // Mixed success/failure (Multi-Status)
            const result = response.response;
            (0, utils_1.olakaiLoggger)(`Batch requests had mixed results: ${result.successCount}/${result.totalRequests} succeeded`, "warn");
            return result; // Note: overall success=true even for partial failures
        }
        else if (response.status === types_1.ErrorCode.FAILED) {
            // All failed or system error
            const result = await response.json();
            (0, utils_1.olakaiLoggger)(`All batch requests failed: ${JSON.stringify(result)}`, "error");
            throw new Error(`Batch processing failed: ${result.message || response.statusText}`);
        }
        else if (!response.ok) {
            // Other error status codes
            (0, utils_1.olakaiLoggger)(`Unexpected API response status: ${response.status}`, "warn");
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        else {
            // Legacy support for other 2xx status codes
            const result = response.response;
            return result;
        }
    }
    catch (err) {
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
async function sendWithRetry(payload, maxRetries = config.retries) {
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await makeAPICall(payload);
            if (response.success) {
                return response;
            }
            else if (response.failureCount && response.failureCount > 0) {
                (0, utils_1.olakaiLoggger)(`Batch partial success: ${response.successCount}/${response.totalRequests} requests succeeded`, "info");
                return response;
            }
        }
        catch (err) {
            lastError = err;
            (0, utils_1.olakaiLoggger)(`Attempt ${attempt + 1}/${maxRetries + 1} failed: ${JSON.stringify(err)}`, "warn");
            if (attempt < maxRetries) {
                // Exponential backoff: 1s, 2s, 4s, 8s...
                const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
                await (0, utils_1.sleep)(config, delay);
            }
        }
    }
    if (config.onError && lastError) {
        config.onError(lastError);
    }
    (0, utils_1.olakaiLoggger)(`All retry attempts failed: ${JSON.stringify(lastError)}`, "error");
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
async function sendToAPI(payload, options = {}) {
    if (!config.apiKey) {
        throw new Error("[Olakai SDK] API key is not set");
    }
    if (isBatchingEnabled) {
        await (0, queue_1.addToQueue)(payload, options);
    }
    else {
        // For non-batching mode, use makeAPICall directly and handle the response
        const response = await makeAPICall(payload);
        // Log any batch-style response information if present
        if (response.totalRequests && response.successCount !== undefined) {
            (0, utils_1.olakaiLoggger)(`Direct API call result: ${response.successCount}/${response.totalRequests} requests succeeded`, response.failureCount && response.failureCount > 0 ? "warn" : "info");
        }
    }
}
// Re-export queue utility functions
var queue_2 = require("./queue");
Object.defineProperty(exports, "getQueueSize", { enumerable: true, get: function () { return queue_2.getQueueSize; } });
Object.defineProperty(exports, "clearQueue", { enumerable: true, get: function () { return queue_2.clearQueue; } });
Object.defineProperty(exports, "flushQueue", { enumerable: true, get: function () { return queue_2.flushQueue; } });
Object.defineProperty(exports, "getQueueManager", { enumerable: true, get: function () { return queue_2.getQueueManager; } });
/**
 * Make a control API call to check if execution should be allowed
 * @param payload - The control payload to send
 * @param endpoint - Optional custom endpoint for control checks
 * @param timeout - Custom timeout for this request
 * @returns A promise that resolves to the control response
 */
async function makeControlAPICall(payload, endpoint, timeout) {
    if (!config.apiKey) {
        throw new Error("[Olakai SDK] API key is not set");
    }
    const controlEndpoint = endpoint || config.domainUrl.replace('/monitoring/prompt', '/control/check');
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
        (0, utils_1.olakaiLoggger)(`Control API response: ${JSON.stringify(response)}`, "info");
        clearTimeout(timeoutId);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();
        // Ensure the response has the expected structure
        if (typeof result.allowed !== 'boolean') {
            throw new Error("Invalid control response: missing 'allowed' field");
        }
        return result;
    }
    catch (err) {
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
async function sendToControlAPI(payload, options = {}) {
    if (!config.apiKey) {
        throw new Error("[Olakai SDK] API key is not set");
    }
    const maxRetries = options.retries ?? config.retries;
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await makeControlAPICall(payload, options.endpoint, options.timeout);
            return response;
        }
        catch (err) {
            lastError = err;
            if (config.debug) {
                console.warn(`[Olakai SDK] Control API attempt ${attempt + 1}/${maxRetries + 1} failed:`, err);
            }
            if (attempt < maxRetries) {
                // Exponential backoff: 1s, 2s, 4s, 8s...
                const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
                await (0, utils_1.sleep)(config, delay);
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
//# sourceMappingURL=client.js.map