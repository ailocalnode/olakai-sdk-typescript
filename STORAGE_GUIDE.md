# Olakai SDK Storage Guide

The Olakai SDK now supports a flexible, hybrid storage system that automatically adapts to your deployment environment while providing explicit control when needed.

## Storage Types

### 1. Auto Detection (`'auto'`) - **Recommended**

The SDK automatically detects the best storage type for your environment:

- **Browser**: Uses `localStorage`
- **Containerized/Serverless** (Docker, Kubernetes, Lambda, Vercel, Netlify): Uses in-memory storage
- **Traditional Servers**: Uses file-based storage

### 2. Memory Storage (`'memory'`)

Fast, in-memory storage using global variables:

- ✅ Ultra-fast performance
- ✅ Works in any environment
- ✅ Container/serverless friendly
- ❌ Lost on restart/deployment

### 3. File Storage (`'file'`)

Persistent JSON file storage in cache directory:

- ✅ Survives restarts
- ✅ Debuggable (can inspect files)
- ✅ Configurable location
- ❌ File I/O overhead
- ❌ May not work in read-only containers

### 4. Browser Storage (`'localStorage'`)

Standard browser localStorage:

- ✅ Browser-native persistence
- ✅ Well-supported
- ❌ Browser-only

## Configuration Examples

### Basic Usage (Recommended)

```typescript
import { initClient } from "olakai-sdk";

// Uses auto-detection - works everywhere
initClient({
  apiKey: "your-api-key",
  // storageType defaults to 'auto'
});
```

### Explicit Storage Types

#### Memory Storage (Fast, Temporary)

```typescript
initClient({
  apiKey: "your-api-key",
  storageType: "memory",
});
```

#### File Storage (Persistent)

```typescript
initClient({
  apiKey: "your-api-key",
  storageType: "file",
  cacheDirectory: "/tmp/olakai-cache", // Optional custom directory
});
```

#### Disable Storage

```typescript
initClient({
  apiKey: "your-api-key",
  enableStorage: false, // Disables all storage
});
```

## Environment-Specific Recommendations

### Development

```typescript
// File storage for debugging and persistence
initClient({
  apiKey: "your-api-key",
  storageType: "file",
  debug: true,
  verbose: true,
});
```

### Production - Containers/Serverless

```typescript
// Memory storage for performance
initClient({
  apiKey: "your-api-key",
  storageType: "memory", // or use 'auto'
});
```

### Production - Traditional Servers

```typescript
// File storage for persistence across restarts
initClient({
  apiKey: "your-api-key",
  storageType: "file",
  cacheDirectory: "/var/cache/olakai",
});
```

### Browser Applications

```typescript
// localStorage for browser persistence
initClient({
  apiKey: "your-api-key",
  storageType: "localStorage", // or use 'auto'
});
```

## Advanced Configuration

### Custom Cache Directory (File Storage)

```typescript
initClient({
  apiKey: "your-api-key",
  storageType: "file",
  cacheDirectory: process.env.CACHE_DIR || "/tmp/my-app-cache",
  maxStorageSize: 5000000, // 5MB limit
});
```

### Environment Variable Configuration

```typescript
initClient({
  apiKey: process.env.OLAKAI_API_KEY,
  storageType: (process.env.OLAKAI_STORAGE as any) || "auto",
  enableStorage: process.env.OLAKAI_DISABLE_STORAGE !== "true",
});
```

## Storage Locations

### File Storage Default Locations

- **Linux/macOS**: `~/.olakai-sdk-cache/`
- **Windows**: `%USERPROFILE%\.olakai-sdk-cache\`
- **Custom**: Specified via `cacheDirectory` option

### File Naming

Storage files use sanitized key names:

- Key: `"olakai-sdk-queue"` → File: `olakai-sdk-queue.json`
- Special characters are replaced with underscores

## Migration from v1.x

If you're upgrading from the old localStorage-only version:

```typescript
// Old way
initClient("api-key", "domain-url", {
  enableLocalStorage: true,
  localStorageKey: "my-queue",
});

// New way (backwards compatible)
initClient({
  apiKey: "api-key",
  domainUrl: "domain-url",
  storageType: "auto", // Better than old localStorage-only
  storageKey: "my-queue",
});
```

## Troubleshooting

### Storage Not Working

1. Check if storage is enabled: `enableStorage: true`
2. Check permissions for file storage locations
3. For containers, prefer `memory` or `auto` storage types

### Performance Issues

1. Use `memory` storage for high-throughput applications
2. Increase `maxStorageSize` if queue is being truncated
3. Consider disabling storage in performance-critical scenarios

### Debugging Storage

```typescript
initClient({
  apiKey: "your-api-key",
  debug: true, // Shows storage operations
  verbose: true, // Shows detailed logs
});
```

## Environment Detection Details

The auto-detection uses these heuristics:

**Containerized Environment Detection:**

- `KUBERNETES_SERVICE_HOST` (Kubernetes)
- `DOCKER_CONTAINER` (Docker)
- `container` environment variable
- Hostname patterns (`k8s-*`, 12-char hex)

**Serverless Environment Detection:**

- `LAMBDA_RUNTIME_DIR` (AWS Lambda)
- `VERCEL` (Vercel)
- `NETLIFY` (Netlify)
- `READ_ONLY` flag

**Browser Detection:**

- `window` and `localStorage` availability
