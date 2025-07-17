import type { SDKConfig, MonitorPayload, ControlPayload, ControlResponse } from "./types";
/**
 * Initialize the SDK
 * @param apiKey - The API key
 * @param domainUrl - The domain URL
 * @param options - The extra options for the SDKConfig
 */
export declare function initClient(apiKey: string, domainUrl: string, options?: Partial<SDKConfig>): Promise<void>;
/**
 * Get the current configuration
 * @returns The current configuration
 */
export declare function getConfig(): SDKConfig;
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
export declare function sendToAPI(payload: MonitorPayload, options?: {
    retries?: number;
    timeout?: number;
    priority?: "low" | "normal" | "high";
}): Promise<void>;
export { getQueueSize, clearQueue, flushQueue, getQueueManager } from './queue';
/**
 * Send a payload to the control API with retry logic
 * @param payload - The control payload to send
 * @param options - The options for the control API call
 * @returns A promise that resolves to the control response
 */
export declare function sendToControlAPI(payload: ControlPayload, options?: {
    endpoint?: string;
    retries?: number;
    timeout?: number;
    priority?: "low" | "normal" | "high";
}): Promise<ControlResponse>;
//# sourceMappingURL=client.d.ts.map