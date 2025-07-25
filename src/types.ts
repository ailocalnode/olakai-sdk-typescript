/**
 * Payload for monitoring API
 */
export type MonitorPayload = {
  email?: string;
  chatId?: string;
  shouldScore?: boolean;
  task?: string;
  subTask?: string;
  prompt: string;
  response: string;
  tokens?: number;
  requestTime?: number;
  errorMessage?: string;
  blocked?: boolean;
};

/**
 * Payload for control API
 */
export type ControlPayload = {
  prompt: string;
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
  onMonitoredFunctionError?: boolean;
  // Dynamic chat and user identification
  chatId?: string | ((args: TArgs) => string);
  email?: string | ((args: TArgs) => string);
  task?: string;
  subTask?: string;
  shouldScore?: boolean;
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
  batchTimeout: number;
  retries: number;
  timeout: number;
  enableStorage: boolean; // Whether to enable storage at all
  storageType: StorageType; // Type of storage to use
  storageKey: string; // Storage key/identifier
  maxStorageSize: number; // Maximum storage size in bytes
  cacheDirectory?: string; // Custom cache directory for file storage (optional)  
  onError: (error: Error) => void;
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
  isAllowed: boolean;
  message?: string;
};

export enum ErrorCode {
  SUCCESS = 201,
  PARTIAL_SUCCESS = 207,
  FAILED = 500,
  BAD_REQUEST = 400,
  UNREACHABLE = 404,
}