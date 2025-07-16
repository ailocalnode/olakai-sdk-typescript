import { isBrowser, isNodeJS } from '../../utils';
import { LocalStorageAdapter } from './localStorage';
import { MemoryStorageAdapter } from './memoryStorage';
import { FileStorageAdapter } from './fileStorage';
import { NoOpStorageAdapter } from './noOpStorage';
import { SDKConfig } from '../../types';


export interface StorageAdapter {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
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
        try {
          return new FileStorageAdapter(cacheDirectory);
        } catch (err) {
          console.warn('[Olakai SDK] File storage not available, falling back to memory storage');
          return new MemoryStorageAdapter();
        }
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

// Helper functions to get effective config values with backwards compatibility
export function isStorageEnabled(config: SDKConfig): boolean {
  return config.enableStorage ?? true;
}
//TODO : Not good if it's server stored
export function getStorageKey(config: SDKConfig): string {
  return config.storageKey ?? "olakai-sdk-queue";
}

export function getMaxStorageSize(config: SDKConfig): number {
  return config.maxStorageSize ?? 1000000;
}