import { StorageAdapter } from ".";

/**
 * Browser localStorage adapter
 */
export class LocalStorageAdapter implements StorageAdapter {
    getItem(key: string): string | null {
      try {
        return localStorage.getItem(key);
      } catch (err) {
        console.warn('[Olakai SDK] LocalStorage access failed:', err);
        return null;
      }
    }
  
    setItem(key: string, value: string): void {
      try {
        localStorage.setItem(key, value);
      } catch (err) {
        console.warn('[Olakai SDK] LocalStorage write failed:', err);
      }
    }
  
    removeItem(key: string): void {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        console.warn('[Olakai SDK] LocalStorage remove failed:', err);
      }
    }
  
    clear(): void {
      try {
        localStorage.clear();
      } catch (err) {
        console.warn('[Olakai SDK] LocalStorage clear failed:', err);
      }
    }
  }