import { StorageAdapter } from ".";
/**
 * In-memory storage adapter (global variable storage)
 */
export declare class MemoryStorageAdapter implements StorageAdapter {
    private storage;
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
}
//# sourceMappingURL=memoryStorage.d.ts.map