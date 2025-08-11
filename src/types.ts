
/**
 * Payload for monitoring API
 */
export type MonitorPayload = {
  email?: string;
  chatId?: string;
  task?: string;
  subTask?: string;
  prompt: JsonValue;
  response: JsonValue;
  tokens?: number;
  requestTime?: number;
  errorMessage?: string;
  blocked?: boolean;
  sensitivity?: string[];
};

/**
 * Payload for control API
 */
export type ControlPayload = {
  prompt: JsonValue;
  email?: string;
  chatId?: string;
  task?: string;
  subTask?: string;
  tokens?: number;
  overrideControlCriteria?: string[];
};

/**
 * Configuration for each monitored function
 */
export type MonitorOptions<TArgs extends any[], TResult> = {
  capture: (ctx: { args: TArgs; result: TResult }) => {
    input: any;
    output: any;
  };
  onMonitoredFunctionError?: boolean; // Whether to throw an error if the monitored function fails
  // Dynamic chat and user identification
  chatId?: string | ((args: TArgs) => string);
  email?: string | ((args: TArgs) => string);
  task?: string;
  subTask?: string;
  sanitize?: boolean; // Whether to sanitize sensitive data
  priority?: "low" | "normal" | "high"; // Priority for batching
  askOverride?: string[]; // List of parameters to override the control check
};

export enum StorageType {
  MEMORY = 'memory',
  FILE = 'file',
  LOCAL_STORAGE = 'localStorage',
  AUTO = 'auto',
  DISABLED = 'disabled',
}

/**
 * Global SDK configuration
 */
export type SDKConfig = {
  apiKey: string;
  monitorEndpoint: string;
  controlEndpoint: string;
  version: string;
  enableBatching: boolean;
  batchSize: number;
  batchTime: number; // Time to wait before processing the next batch
  retries: number;
  timeout: number;
  enableStorage: boolean; // Whether to enable storage at all
  storageType: StorageType; // Type of storage to use
  storageKey: string; // Storage key/identifier
  maxStorageSize: number; // Maximum storage size in bytes
  cacheDirectory?: string; // Custom cache directory for file storage (optional)  
  sanitizePatterns: RegExp[];
  debug: boolean;
  verbose: boolean;
};

/**
 * Batch request for reporting API
 */
export type BatchRequest = {
  id: string;
  payload: MonitorPayload[];
  timestamp: number;
  retries: number;
  priority: "low" | "normal" | "high";
};


/**
 * Response for monitoring API
 */
export type MonitoringAPIResponse = {
  success: boolean;
  message: string;
  // New batch response format fields
  totalRequests: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    index: number;
    success: boolean;
    promptRequestId: string | null;
    error: string | null;
  }>;
};

/**
 * Response for control API
 */
export type ControlAPIResponse = {
  allowed: boolean;
  details: {
    detectedSensitivity: string[];
    isAllowedPersona: boolean;
  };
  message?: string;
};

export enum ErrorCode {
  SUCCESS = 201,
  PARTIAL_SUCCESS = 207,
  FAILED = 500,
  BAD_REQUEST = 400,
  UNREACHABLE = 404,
}

/**
 * Represents any valid JSON value.
 */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonArray
  | JsonObject;

/**
 * Represents an array of JSON values.
 */
export type JsonArray = JsonValue[];

/**
 * Represents a JSON object, which is a key-value map where keys are strings and
 * values are any valid JSON value.
 */
export type JsonObject = { [key: string]: undefined | JsonValue };