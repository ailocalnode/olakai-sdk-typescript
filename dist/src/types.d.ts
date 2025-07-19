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
    endpoint?: string;
    timeout?: number;
    retries?: number;
    captureInput: (args: TArgs) => any;
    onBlocked?: (args: TArgs, controlResponse: any) => void | never;
    onError?: (error: any, args: TArgs) => boolean;
    sanitize?: boolean;
    priority?: "low" | "normal" | "high";
};
/**
 * Configuration for each monitored function
 */
export type MonitorOptions<TArgs extends any[], TResult> = {
    task?: string;
    subTask?: string;
    shouldScore?: boolean;
    capture: (ctx: {
        args: TArgs;
        result: TResult;
    }) => {
        input: any;
        output: any;
    };
    onError?: (error: any, args: TArgs) => {
        input: any;
        output: any;
    };
    chatId?: string | ((args: TArgs) => string);
    email?: string | ((args: TArgs) => string);
    sanitize?: boolean;
    priority?: "low" | "normal" | "high";
    control?: ControlOptions<TArgs>;
};
export declare enum StorageType {
    MEMORY = "memory",
    FILE = "file",
    LOCAL_STORAGE = "localStorage",
    AUTO = "auto",
    DISABLED = "disabled"
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
    enableStorage: boolean;
    storageType: StorageType;
    storageKey: string;
    maxStorageSize: number;
    cacheDirectory?: string;
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
export type APIResponse = {
    success: boolean;
    message: string;
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
export declare enum ErrorCode {
    SUCCESS = 200,
    PARTIAL_SUCCESS = 207,
    FAILED = 500,
    BAD_REQUEST = 400
}
//# sourceMappingURL=types.d.ts.map