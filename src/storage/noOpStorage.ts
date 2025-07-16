import { StorageAdapter } from ".";

/**
 * No-op storage adapter for when storage is disabled
 */
export class NoOpStorageAdapter implements StorageAdapter {
  getItem(_key: string): string | null {
    return null;
  }

  setItem(_key: string, _value: string): void {
    // No-op
  }

  removeItem(_key: string): void {
    // No-op
  }

  clear(): void {
    // No-op
  }
}