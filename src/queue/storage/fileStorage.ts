import { StorageAdapter } from ".";

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

/**
 * Node.js file-based storage adapter
 */
export class FileStorageAdapter implements StorageAdapter {
    private cacheDir: string;
    private isAvailable: boolean;
  
    constructor(customCacheDir?: string) {
      this.isAvailable = !!(fs && path && os);
      if (this.isAvailable) {
        // Use custom cache directory or default to user's home directory
        this.cacheDir = customCacheDir || path.join(os.homedir(), '.olakai-sdk-cache');
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