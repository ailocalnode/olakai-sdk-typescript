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

/**
 * In-memory storage adapter (global variable storage)
 */
class MemoryStorageAdapter implements StorageAdapter {
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
 * Environment detection utilities
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function isNodeJS(): boolean {
  return typeof process !== 'undefined' && process.versions && process.versions.node !== 'false';
}

function isContainerized(): boolean {
  // Simple heuristics to detect containerized environments
  if (!isNodeJS()) return false;
  
  // Check common container environment variables
  if (process.env.KUBERNETES_SERVICE_HOST) return true;
  if (process.env.DOCKER_CONTAINER) return true;
  if (process.env.container) return true;
  
  // Check hostname patterns
  const hostname = process.env.HOSTNAME;
  if (hostname) {
    if (hostname.startsWith('k8s-')) return true;
    if (/^[a-f0-9]{12}$/.test(hostname)) return true; // Docker-style hostname
  }
  
  return false;
}

function isReadOnlyFileSystem(): boolean {
  // Check if we're likely in a read-only environment
  if (!isNodeJS()) return false;
  
  return !!(
    process.env.READ_ONLY ||
    process.env.LAMBDA_RUNTIME_DIR || // AWS Lambda
    process.env.VERCEL || // Vercel
    process.env.NETLIFY // Netlify
  );
}

/**
 * Auto-detect the best storage type for the current environment
 */
function detectOptimalStorageType(): 'memory' | 'file' | 'localStorage' {
  if (isBrowser()) {
    return 'localStorage';
  }

  if (isNodeJS()) {
    // In containerized or serverless environments, prefer memory
    if (isContainerized() || isReadOnlyFileSystem()) {
      return 'memory';
    }
    // For traditional servers, use file storage
    return 'file';
  }

  // Fallback to memory for unknown environments
  return 'memory';
}

/**
 * Creates the appropriate storage adapter based on type and configuration
 */
export function createStorageAdapter(
  storageType: 'memory' | 'file' | 'localStorage' | 'auto' | 'disabled' = 'auto',
  cacheDirectory?: string
): StorageAdapter {
  if (storageType === 'disabled') {
    return new NoOpStorageAdapter();
  }

  // Resolve 'auto' to a concrete type
  if (storageType === 'auto') {
    storageType = detectOptimalStorageType();
  }

  switch (storageType) {
    case 'localStorage':
      if (isBrowser()) {
        return new LocalStorageAdapter();
      } else {
        console.warn('[Olakai SDK] localStorage not available, falling back to memory storage');
        return new MemoryStorageAdapter();
      }

    case 'file':
      if (isNodeJS()) {
        return new FileStorageAdapter(cacheDirectory);
      } else {
        console.warn('[Olakai SDK] File storage not available in browser, falling back to localStorage');
        return new LocalStorageAdapter();
      }

    case 'memory':
      return new MemoryStorageAdapter();

    default:
      console.warn(`[Olakai SDK] Unknown storage type: ${storageType}, using memory storage`);
      return new MemoryStorageAdapter();
  }
}

/**
 * Global storage instance
 */
let storageInstance: StorageAdapter | null = null;

/**
 * Initialize storage with the given configuration
 */
export function initStorage(
  storageType: 'memory' | 'file' | 'localStorage' | 'auto' | 'disabled' = 'auto',
  cacheDirectory?: string
): StorageAdapter {
  storageInstance = createStorageAdapter(storageType, cacheDirectory);
  return storageInstance;
}

/**
 * Get the current storage instance
 */
export function getStorage(): StorageAdapter {
  if (!storageInstance) {
    storageInstance = createStorageAdapter('auto');
  }
  return storageInstance;
} 