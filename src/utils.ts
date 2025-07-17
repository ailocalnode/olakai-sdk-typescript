import type { SDKConfig, MonitorOptions} from "./types";
import { StorageType } from "./types";

// Common patterns for sanitizing sensitive data
export const DEFAULT_SANITIZE_PATTERNS = [
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
export function validateConfig(config: Partial<SDKConfig>): string[] {
  const errors: string[] = [];

  if (!config.apiKey || config.apiKey.trim() === "") {
    errors.push("API key is required");
  }

  if (config.domainUrl && !isValidUrl(config.domainUrl)) {
    errors.push("API URL must be a valid URL");
  }

  if (
    config.batchSize !== undefined &&
    (config.batchSize <= 0 || config.batchSize > 1000)
  ) {
    errors.push("Batch size must be between 1 and 1000");
  }

  if (config.batchTimeout !== undefined && config.batchTimeout < 0) {
    errors.push("Batch timeout must be non-negative");
  }

  if (
    config.retries !== undefined &&
    (config.retries < 0 || config.retries > 10)
  ) {
    errors.push("Retries must be between 0 and 10");
  }

  if (config.timeout !== undefined && config.timeout <= 0) {
    errors.push("Timeout must be positive");
  }

  if (
    config.maxStorageSize !== undefined &&
    config.maxStorageSize <= 0
  ) {
    errors.push("Max storage size must be positive");
  }

  return errors;
}

// Validate monitor options
export function validateMonitorOptions<TArgs extends any[], TResult>(
  options: MonitorOptions<TArgs, TResult>,
): string[] {
  const errors: string[] = [];

  if (!options.task || options.task.trim() === "") {
    errors.push("Monitor name is required");
  }

  if (!options.capture || typeof options.capture !== "function") {
    errors.push("Capture function is required");
  }

  return errors;
}

// Check if a string is a valid URL
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format duration for human readable output
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  if (ms < 3600000) {
    return `${(ms / 60000).toFixed(1)}m`;
  }
  return `${(ms / 3600000).toFixed(1)}h`;
}

// Environment detection
export function getEnvironment(): string {
  if (typeof window !== "undefined") {
    return "browser";
  }
  if (typeof process !== "undefined" && process.env) {
    return process.env.NODE_ENV || "development";
  }
  return "unknown";
}

// Create a configuration builder pattern
export class ConfigBuilder {
  private config: Partial<SDKConfig> = {};

  apiKey(key: string): ConfigBuilder {
    this.config.apiKey = key;
    return this;
  }

  domainUrl(url: string): ConfigBuilder {
    this.config.domainUrl = url;
    return this;
  }

  version(v: string): ConfigBuilder {
    this.config.version = v;
    return this;
  }

  batchSize(size: number): ConfigBuilder {
    this.config.batchSize = size;
    return this;
  }

  batchTimeout(timeout: number): ConfigBuilder {
    this.config.batchTimeout = timeout;
    return this;
  }

  retries(count: number): ConfigBuilder {
    this.config.retries = count;
    return this;
  }

  timeout(ms: number): ConfigBuilder {
    this.config.timeout = ms;
    return this;
  }

  enableStorage(enable: boolean = true): ConfigBuilder {
    this.config.enableStorage = enable;
    return this;
  }

  storageKey(key: string): ConfigBuilder {
    this.config.storageKey = key;
    return this;
  }

  maxStorageSize(size: number): ConfigBuilder {
    this.config.maxStorageSize = size;
    return this;
  }

  debug(enable: boolean = true): ConfigBuilder {
    this.config.debug = enable;
    return this;
  }

  onError(handler: (error: Error) => void): ConfigBuilder {
    this.config.onError = handler;
    return this;
  }

  storageType(type: StorageType = StorageType.AUTO): ConfigBuilder {
    this.config.storageType = type;
    return this;
  }

  sanitizePatterns(patterns: RegExp[]): ConfigBuilder {
    this.config.sanitizePatterns = patterns;
    return this;
  }

  verbose(enable: boolean = true): ConfigBuilder {
    this.config.verbose = enable;
    return this;
  }

  build(): SDKConfig {
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
      onError: (_error: Error) => {},
      sanitizePatterns: DEFAULT_SANITIZE_PATTERNS,
      debug: false,
      verbose: false,
      ...this.config,
    } as SDKConfig;
  }
}

// Factory function for the builder
export function createConfig(): ConfigBuilder {
  return new ConfigBuilder();
}

export function toApiString(val: any): string {
  if (typeof val === "string") return val;
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
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function isNodeJS(): boolean {
  return typeof process !== 'undefined' && process.versions && process.versions.node !== 'false';
}

/**
 * Sleep for a given number of milliseconds
 * @param ms - The number of milliseconds to sleep
 * @returns A promise that resolves after the given number of milliseconds
 */
export async function sleep(config: SDKConfig, ms: number): Promise<void> {
  if (config.verbose) {
    console.log("[Olakai SDK] Sleeping for", ms, "ms");
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}