"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigBuilder = exports.DEFAULT_SANITIZE_PATTERNS = void 0;
exports.validateConfig = validateConfig;
exports.validateMonitorOptions = validateMonitorOptions;
exports.getEnvironment = getEnvironment;
exports.createConfig = createConfig;
exports.toApiString = toApiString;
exports.isBrowser = isBrowser;
exports.isNodeJS = isNodeJS;
exports.sleep = sleep;
const types_1 = require("./types");
// Common patterns for sanitizing sensitive data
exports.DEFAULT_SANITIZE_PATTERNS = [
    /\b[\w.-]+@[\w.-]+\.\w+\b/g, // Email addresses
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card numbers
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /"password"\s*:\s*"[^"]*"/g, // Password fields in JSON
    /"token"\s*:\s*"[^"]*"/g, // Token fields in JSON
    /"apiKey"\s*:\s*"[^"]*"/g, // API key fields in JSON
    /"secret"\s*:\s*"[^"]*"/g, // Secret fields in JSON
    /Authorization:\s*Bearer\s+[\w.-]+/g, // Bearer tokens
    /api[_-]?key\s*[:=]\s*[\w-]+/gi, // API keys
];
// Validate SDK configuration
function validateConfig(config) {
    const errors = [];
    if (!config.apiKey || config.apiKey.trim() === "") {
        errors.push("API key is required");
    }
    if (config.domainUrl && !isValidUrl(config.domainUrl)) {
        errors.push("API URL must be a valid URL");
    }
    if (config.batchSize !== undefined &&
        (config.batchSize <= 0 || config.batchSize > 1000)) {
        errors.push("Batch size must be between 1 and 1000");
    }
    if (config.batchTimeout !== undefined && config.batchTimeout < 0) {
        errors.push("Batch timeout must be non-negative");
    }
    if (config.retries !== undefined &&
        (config.retries < 0 || config.retries > 10)) {
        errors.push("Retries must be between 0 and 10");
    }
    if (config.timeout !== undefined && config.timeout <= 0) {
        errors.push("Timeout must be positive");
    }
    if (config.maxStorageSize !== undefined &&
        config.maxStorageSize <= 0) {
        errors.push("Max storage size must be positive");
    }
    return errors;
}
// Validate monitor options
function validateMonitorOptions(options) {
    const errors = [];
    if (!options.task || options.task.trim() === "") {
        errors.push("Monitor name is required");
    }
    if (!options.capture || typeof options.capture !== "function") {
        errors.push("Capture function is required");
    }
    return errors;
}
// Check if a string is a valid URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    }
    catch {
        return false;
    }
}
// Environment detection
function getEnvironment() {
    if (typeof window !== "undefined") {
        return "browser";
    }
    if (typeof process !== "undefined" && process.env) {
        return process.env.NODE_ENV || "development";
    }
    return "unknown";
}
// Create a configuration builder pattern
class ConfigBuilder {
    config = {};
    apiKey(key) {
        this.config.apiKey = key;
        return this;
    }
    domainUrl(url) {
        this.config.domainUrl = url;
        return this;
    }
    version(v) {
        this.config.version = v;
        return this;
    }
    batchSize(size) {
        this.config.batchSize = size;
        return this;
    }
    batchTimeout(timeout) {
        this.config.batchTimeout = timeout;
        return this;
    }
    retries(count) {
        this.config.retries = count;
        return this;
    }
    timeout(ms) {
        this.config.timeout = ms;
        return this;
    }
    enableStorage(enable = true) {
        this.config.enableStorage = enable;
        return this;
    }
    storageKey(key) {
        this.config.storageKey = key;
        return this;
    }
    maxStorageSize(size) {
        this.config.maxStorageSize = size;
        return this;
    }
    debug(enable = true) {
        this.config.debug = enable;
        return this;
    }
    onError(handler) {
        this.config.onError = handler;
        return this;
    }
    storageType(type = types_1.StorageType.AUTO) {
        this.config.storageType = type;
        return this;
    }
    sanitizePatterns(patterns) {
        this.config.sanitizePatterns = patterns;
        return this;
    }
    verbose(enable = true) {
        this.config.verbose = enable;
        return this;
    }
    build() {
        const errors = validateConfig(this.config);
        if (errors.length > 0) {
            throw new Error(`Configuration validation failed: ${errors.join(", ")}`);
        }
        return {
            apiKey: "",
            domainUrl: "",
            batchSize: 10,
            batchTimeout: 5000,
            retries: 3,
            timeout: 10000,
            enableStorage: true,
            storageKey: "olakai-sdk-queue",
            maxStorageSize: 1000000,
            onError: (_error) => { },
            sanitizePatterns: exports.DEFAULT_SANITIZE_PATTERNS,
            debug: false,
            verbose: false,
            ...this.config,
        };
    }
}
exports.ConfigBuilder = ConfigBuilder;
// Factory function for the builder
function createConfig() {
    return new ConfigBuilder();
}
function toApiString(val) {
    if (typeof val === "string")
        return val;
    if (val && typeof val === "object") {
        // Option 1: key-value pairs
        return Object.entries(val)
            .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
            .join("; ");
        // Option 2: JSON
        // return JSON.stringify(val);
    }
    return String(val);
}
/**
 * Environment detection utilities
 */
function isBrowser() {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}
function isNodeJS() {
    return typeof process !== 'undefined' && process.versions && process.versions.node !== 'false';
}
/**
 * Sleep for a given number of milliseconds
 * @param ms - The number of milliseconds to sleep
 * @returns A promise that resolves after the given number of milliseconds
 */
async function sleep(config, ms) {
    if (config.verbose) {
        console.log("[Olakai SDK] Sleeping for", ms, "ms");
    }
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=utils.js.map