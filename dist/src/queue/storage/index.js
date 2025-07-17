"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStorageAdapter = createStorageAdapter;
exports.initStorage = initStorage;
exports.getStorage = getStorage;
exports.isStorageEnabled = isStorageEnabled;
exports.getStorageKey = getStorageKey;
exports.getMaxStorageSize = getMaxStorageSize;
const utils_1 = require("../../utils");
const localStorage_1 = require("./localStorage");
const memoryStorage_1 = require("./memoryStorage");
const fileStorage_1 = require("./fileStorage");
const noOpStorage_1 = require("./noOpStorage");
const types_1 = require("../../types");
function isContainerized() {
    // Simple heuristics to detect containerized environments
    if (!(0, utils_1.isNodeJS)())
        return false;
    // Check common container environment variables
    if (process.env.KUBERNETES_SERVICE_HOST)
        return true;
    if (process.env.DOCKER_CONTAINER)
        return true;
    if (process.env.container)
        return true;
    // Check hostname patterns
    const hostname = process.env.HOSTNAME;
    if (hostname) {
        if (hostname.startsWith('k8s-'))
            return true;
        if (/^[a-f0-9]{12}$/.test(hostname))
            return true; // Docker-style hostname
    }
    return false;
}
function isReadOnlyFileSystem() {
    // Check if we're likely in a read-only environment
    if (!(0, utils_1.isNodeJS)())
        return false;
    return !!(process.env.READ_ONLY ||
        process.env.LAMBDA_RUNTIME_DIR || // AWS Lambda
        process.env.VERCEL || // Vercel
        process.env.NETLIFY // Netlify
    );
}
/**
 * Auto-detect the best storage type for the current environment
 */
function detectOptimalStorageType() {
    if ((0, utils_1.isBrowser)()) {
        return types_1.StorageType.LOCAL_STORAGE;
    }
    if ((0, utils_1.isNodeJS)()) {
        // In containerized or serverless environments, prefer memory
        if (isContainerized() || isReadOnlyFileSystem()) {
            return types_1.StorageType.MEMORY;
        }
        // For traditional servers, use file storage
        return types_1.StorageType.FILE;
    }
    // Fallback to memory for unknown environments
    return types_1.StorageType.MEMORY;
}
/**
 * Creates the appropriate storage adapter based on type and configuration
 */
function createStorageAdapter(storageType = types_1.StorageType.AUTO, cacheDirectory) {
    if (storageType === types_1.StorageType.DISABLED) {
        return new noOpStorage_1.NoOpStorageAdapter();
    }
    // Resolve 'auto' to a concrete type
    if (storageType === types_1.StorageType.AUTO) {
        storageType = detectOptimalStorageType();
    }
    switch (storageType) {
        case types_1.StorageType.LOCAL_STORAGE:
            if ((0, utils_1.isBrowser)()) {
                return new localStorage_1.LocalStorageAdapter();
            }
            else {
                console.warn('[Olakai SDK] localStorage not available, falling back to memory storage');
                return new memoryStorage_1.MemoryStorageAdapter();
            }
        case types_1.StorageType.FILE:
            if ((0, utils_1.isNodeJS)()) {
                try {
                    return new fileStorage_1.FileStorageAdapter(cacheDirectory);
                }
                catch (err) {
                    console.warn('[Olakai SDK] File storage not available, falling back to memory storage');
                    return new memoryStorage_1.MemoryStorageAdapter();
                }
            }
            else {
                console.warn('[Olakai SDK] File storage not available in browser, falling back to localStorage');
                if ((0, utils_1.isBrowser)()) {
                    return new localStorage_1.LocalStorageAdapter();
                }
                else {
                    console.warn('[Olakai SDK] LocalStorage not available, falling back to memory storage');
                    return new memoryStorage_1.MemoryStorageAdapter();
                }
            }
        case types_1.StorageType.MEMORY:
            return new memoryStorage_1.MemoryStorageAdapter();
        default:
            console.warn(`[Olakai SDK] Unknown storage type: ${storageType}, using memory storage`);
            return new memoryStorage_1.MemoryStorageAdapter();
    }
}
/**
 * Global storage instance
 */
let storageInstance = null;
/**
 * Initialize storage with the given configuration
 */
function initStorage(storageType = types_1.StorageType.AUTO, cacheDirectory) {
    storageInstance = createStorageAdapter(storageType, cacheDirectory);
    return storageInstance;
}
/**
 * Get the current storage instance
 */
function getStorage() {
    if (!storageInstance) {
        storageInstance = createStorageAdapter(types_1.StorageType.AUTO);
    }
    return storageInstance;
}
// Helper functions to get effective config values with backwards compatibility
function isStorageEnabled(config) {
    return config.enableStorage ?? true;
}
//TODO : Not good if it's server stored
function getStorageKey(config) {
    return config.storageKey ?? "olakai-sdk-queue";
}
function getMaxStorageSize(config) {
    return config.maxStorageSize ?? 1000000;
}
//# sourceMappingURL=index.js.map