import { StorageAdapter } from ".";


/**
 * In-memory storage adapter (global variable storage)
 */
export class MemoryStorageAdapter implements StorageAdapter {
    private storage: Map<string, string> = new Map();
  
    getItem(key: string): string | null {
      return this.storage.get(key) || null;
    }
  
    setItem(key: string, value: string): void {
      this.storage.set(key, value);
    }
  
    removeItem(key: string): void {
      this.storage.delete(key);
    }
  
    clear(): void {
      this.storage.clear();
    }
  }