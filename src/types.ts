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
};

/**
 * Configuration for control behavior
 */
export type ControlOptions<TArgs extends any[]> = {
  enabled?: boolean | ((args: TArgs) => boolean);
  endpoint?: string; // Optional separate endpoint for control checks
  timeout?: number; // Timeout for the control API call
  retries?: number; // Number of retries for failed control API calls
  captureInput: (args: TArgs) => any; // Function to extract input for control check
  onBlocked?: (args: TArgs, controlResponse: any) => void | never; // Handler when control blocks execution
  onError?: (error: any, args: TArgs) => boolean; // Handler for control API errors, return true to allow execution
  sanitize?: boolean; // Whether to sanitize input before sending to control API
  priority?: "low" | "normal" | "high"; // Priority for control API calls
};

/**
 * Configuration for each monitored function
 */
export type MonitorOptions<TArgs extends any[], TResult> = {
  task?: string;
  subTask?: string;
  shouldScore?: boolean;
  capture: (ctx: { args: TArgs; result: TResult }) => {
    input: any;
    output: any;
  };
  onError?: (
    error: any,
    args: TArgs,
  ) => {
    input: any;
    output: any;
  };
  // Dynamic chat and user identification
  chatId?: string | ((args: TArgs) => string);
  email?: string | ((args: TArgs) => string);
  sanitize?: boolean; // Whether to sanitize sensitive data
  priority?: "low" | "normal" | "high"; // Priority for batching
  control?: ControlOptions<TArgs>; // Control configuration
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
  domainUrl: string;
  version: string;
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

export type BatchRequest = {
  id: string;
  payload: MonitorPayload[];
  timestamp: number;
  retries: number;
  priority: "low" | "normal" | "high";
};

export type APIResponse = Response & {
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

export type ControlPayload = {
  input: any;
};

export type ControlResponse = {
  allowed: boolean;
  reason?: string;
  metadata?: Record<string, any>;
};

export enum ErrorCode {
  SUCCESS = 201,
  PARTIAL_SUCCESS = 207,
  FAILED = 500,
  BAD_REQUEST = 400,

}