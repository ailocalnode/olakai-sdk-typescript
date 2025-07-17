import type { SDKConfig, MonitorOptions } from "./types";
import { StorageType } from "./types";
export declare const DEFAULT_SANITIZE_PATTERNS: RegExp[];
export declare function validateConfig(config: Partial<SDKConfig>): string[];
export declare function validateMonitorOptions<TArgs extends any[], TResult>(options: MonitorOptions<TArgs, TResult>): string[];
export declare function getEnvironment(): string;
export declare class ConfigBuilder {
    private config;
    apiKey(key: string): ConfigBuilder;
    domainUrl(url: string): ConfigBuilder;
    version(v: string): ConfigBuilder;
    batchSize(size: number): ConfigBuilder;
    batchTimeout(timeout: number): ConfigBuilder;
    retries(count: number): ConfigBuilder;
    timeout(ms: number): ConfigBuilder;
    enableStorage(enable?: boolean): ConfigBuilder;
    storageKey(key: string): ConfigBuilder;
    maxStorageSize(size: number): ConfigBuilder;
    debug(enable?: boolean): ConfigBuilder;
    onError(handler: (error: Error) => void): ConfigBuilder;
    storageType(type?: StorageType): ConfigBuilder;
    sanitizePatterns(patterns: RegExp[]): ConfigBuilder;
    verbose(enable?: boolean): ConfigBuilder;
    build(): SDKConfig;
}
export declare function createConfig(): ConfigBuilder;
export declare function toApiString(val: any): string;
/**
 * Environment detection utilities
 */
export declare function isBrowser(): boolean;
export declare function isNodeJS(): boolean;
/**
 * Sleep for a given number of milliseconds
 * @param ms - The number of milliseconds to sleep
 * @returns A promise that resolves after the given number of milliseconds
 */
export declare function sleep(config: SDKConfig, ms: number): Promise<void>;
//# sourceMappingURL=utils.d.ts.map