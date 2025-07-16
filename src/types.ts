export type MonitorPayload = {
  userId?: string;
  chatId?: string;
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
  name: string;
  capture: (ctx: { args: TArgs; result: TResult }) => {
    input: any;
    output: any;
    metadata?: Record<string, any>;
  };
  onError?: (
    error: any,
    args: TArgs,
  ) => {
    input: any;
    output: any;
    metadata?: Record<string, any>;
  };
  // Dynamic chat and user identification
  chatId?: string | ((args: TArgs) => string);
  userId?: string | ((args: TArgs) => string);
  // May be deprecated if not needed
  enabled?: boolean | ((args: TArgs) => boolean);
  sampleRate?: number; // 0-1, percentage of calls to monitor
  timeout?: number; // Timeout for the API call
  retries?: number; // Number of retries for failed API calls
  tags?: Record<string, string>; // Additional tags for filtering
  sanitize?: boolean; // Whether to sanitize sensitive data
  priority?: "low" | "normal" | "high"; // Priority for batching
  control?: ControlOptions<TArgs>; // Control configuration
};

/**
 * Global SDK configuration
 */
export type SDKConfig = {
  apiKey: string;
  apiUrl: string;
  version: string;
  batchSize: number;
  batchTimeout: number;
  retries: number;
  timeout: number;
  enableStorage: boolean; // Whether to enable storage at all
  storageType: 'memory' | 'file' | 'auto'; // Type of storage to use
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
  payload: MonitorPayload;
  timestamp: number;
  retries: number;
  priority: "low" | "normal" | "high";
};

export type APIResponse = {
  success: boolean;
  message?: string;
  errors?: string[];
};

export type ControlPayload = {
  input: any;
};

export type ControlResponse = {
  allowed: boolean;
  reason?: string;
  metadata?: Record<string, any>;
};

export type Middleware<TArgs extends any[], TResult> = {
  name: string;
  beforeCall?: (args: TArgs) => TArgs | Promise<TArgs>;
  afterCall?: (result: TResult, args: TArgs) => TResult | Promise<TResult>;
  onError?: (error: any, args: TArgs) => void | Promise<void>;
};
