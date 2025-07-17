import { StorageAdapter } from ".";
/**
 * Browser localStorage adapter
 */
export declare class LocalStorageAdapter implements StorageAdapter {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
}
//# sourceMappingURL=localStorage.d.ts.map