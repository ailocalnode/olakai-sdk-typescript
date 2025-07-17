import { StorageAdapter } from ".";
/**
 * Node.js file-based storage adapter
 */
export declare class FileStorageAdapter implements StorageAdapter {
    private cacheDir;
    private isAvailable;
    constructor(customCacheDir?: string);
    private ensureCacheDir;
    private getFilePath;
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
}
//# sourceMappingURL=fileStorage.d.ts.map