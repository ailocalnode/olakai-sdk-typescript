export type OlakaiEventParams = {
  prompt: string;
  response: string;
  email?: string;
  chatId?: string; // UUID - groups activities together in Olakai
  task?: string;
  subTask?: string;
  tokens?: number;
  requestTime?: number;
  shouldScore?: boolean; // Whether to score this activity
  custom_dimensions?: {
    dim1?: string;
    dim2?: string;
    dim3?: string;
    dim4?: string;
    dim5?: string;
    [key: string]: string | undefined;
  };
  custom_metrics?: {
    metric1?: number;
    metric2?: number;
    metric3?: number;
    metric4?: number;
    metric5?: number;
    [key: string]: number | undefined;
  };
};

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
 * Global SDK configuration
 */
export type SDKConfig = {
  apiKey: string;
  monitorEndpoint: string;
  controlEndpoint: string;
  version: string;
  retries: number;
  timeout: number;
  debug: boolean;
  verbose: boolean;
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

export type SanitizePattern = {
  pattern?: RegExp;
  key?: string;
  replacement?: string;
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
