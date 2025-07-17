import { SDKConfig, StorageType } from '../../types';
export interface StorageAdapter {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
}
/**
 * Creates the appropriate storage adapter based on type and configuration
 */
export declare function createStorageAdapter(storageType?: StorageType, cacheDirectory?: string): StorageAdapter;
/**
 * Initialize storage with the given configuration
 */
export declare function initStorage(storageType?: StorageType, cacheDirectory?: string): StorageAdapter;
/**
 * Get the current storage instance
 */
export declare function getStorage(): StorageAdapter;
export declare function isStorageEnabled(config: SDKConfig): boolean;
export declare function getStorageKey(config: SDKConfig): string;
export declare function getMaxStorageSize(config: SDKConfig): number;
//# sourceMappingURL=index.d.ts.map