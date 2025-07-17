import { StorageAdapter } from ".";
/**
 * No-op storage adapter for when storage is disabled
 */
export declare class NoOpStorageAdapter implements StorageAdapter {
    getItem(_key: string): string | null;
    setItem(_key: string, _value: string): void;
    removeItem(_key: string): void;
    clear(): void;
}
//# sourceMappingURL=noOpStorage.d.ts.map