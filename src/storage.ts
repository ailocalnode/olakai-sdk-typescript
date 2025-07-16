// Conditional imports for Node.js modules to avoid errors in browser environments
let fs: any, path: any, os: any;

try {
  // These imports will only work in Node.js environments
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    fs = require('fs');
    path = require('path');
    os = require('os');
  }
} catch (err) {
  // Ignore import errors in browser environments
}

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

/**
 * Browser localStorage adapter
 */
class LocalStorageAdapter implements StorageAdapter {
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

/**
 * Node.js file-based storage adapter
 */
class FileStorageAdapter implements StorageAdapter {
  private cacheDir: string;
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = !!(fs && path && os);
    if (this.isAvailable) {
      // Create cache directory in user's home directory
      this.cacheDir = path.join(os.homedir(), '.olakai-sdk-cache');
      this.ensureCacheDir();
    } else {
      this.cacheDir = '';
      console.warn('[Olakai SDK] Node.js file system modules not available, file storage disabled');
    }
  }

  private ensureCacheDir(): void {
    if (!this.isAvailable) return;
    
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
    } catch (err) {
      console.warn('[Olakai SDK] Failed to create cache directory:', err);
    }
  }

  private getFilePath(key: string): string {
    if (!this.isAvailable || !path) {
      return '';
    }
    // Sanitize key to make it a valid filename
    const sanitizedKey = key.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.cacheDir, `${sanitizedKey}.json`);
  }

  getItem(key: string): string | null {
    if (!this.isAvailable) return null;
    
    try {
      const filePath = this.getFilePath(key);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return data;
      }
      return null;
    } catch (err) {
      console.warn('[Olakai SDK] File storage read failed:', err);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    if (!this.isAvailable) return;
    
    try {
      this.ensureCacheDir();
      const filePath = this.getFilePath(key);
      fs.writeFileSync(filePath, value, 'utf8');
    } catch (err) {
      console.warn('[Olakai SDK] File storage write failed:', err);
    }
  }

  removeItem(key: string): void {
    if (!this.isAvailable) return;
    
    try {
      const filePath = this.getFilePath(key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn('[Olakai SDK] File storage remove failed:', err);
    }
  }

  clear(): void {
    if (!this.isAvailable) return;
    
    try {
      if (fs.existsSync(this.cacheDir)) {
        const files = fs.readdirSync(this.cacheDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            fs.unlinkSync(path.join(this.cacheDir, file));
          }
        }
      }
    } catch (err) {
      console.warn('[Olakai SDK] File storage clear failed:', err);
    }
  }
}

/**
 * No-op storage adapter for when storage is disabled
 */
class NoOpStorageAdapter implements StorageAdapter {
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

/**
 * Detects the environment and returns the appropriate storage adapter
 */
export function createStorageAdapter(enableStorage: boolean = true): StorageAdapter {
  if (!enableStorage) {
    return new NoOpStorageAdapter();
  }

  // Check if we're in a browser environment
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return new LocalStorageAdapter();
  }

  // Check if we're in Node.js environment
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    return new FileStorageAdapter();
  }

  // Fallback to no-op storage
  console.warn('[Olakai SDK] Unable to detect environment, disabling storage');
  return new NoOpStorageAdapter();
}

/**
 * Global storage instance
 */
let storageInstance: StorageAdapter | null = null;

/**
 * Initialize storage with the given configuration
 */
export function initStorage(enableStorage: boolean = true): StorageAdapter {
  storageInstance = createStorageAdapter(enableStorage);
  return storageInstance;
}

/**
 * Get the current storage instance
 */
export function getStorage(): StorageAdapter {
  if (!storageInstance) {
    storageInstance = createStorageAdapter();
  }
  return storageInstance;
} 