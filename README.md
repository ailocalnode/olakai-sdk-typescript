# Olakai SDK Examples

This document demonstrates how to use the Olakai SDK with all its features.

## Quick Start

```typescript
import { initClient, monitor, createConfig } from "@olakai/api-sdk";

// Initialize with simple API key
initClient("your-api-key");

// Or use advanced configuration
const config = createConfig()
  .apiKey("your-api-key")
  .apiUrl("https://api.your-domain.com/log")
  .environment("production")
  .userId("user-123")
  .sessionId("session-456")
  .version("1.0.0")
  .batchSize(20)
  .batchTimeout(3000)
  .retries(3)
  .debug(true)
  .build();

initClient(config);
```

## Basic Function Monitoring

```typescript
import { monitor } from "@olakai/api-sdk";

// Monitor a simple function
const monitored = monitor({
  name: "userLogin",
  capture: ({ args, result }) => ({
    prompt: { email: args[0] },
    response: { success: result.success, userId: result.userId },
  }),
  onError: (error, args) => ({
    input: { email: args[0] },
    output: { error: error.message },
  }),
});

const loginUser = monitored(async (email: string, password: string) => {
  // Your login logic here
  return { success: true, userId: "123" };
});
```

## Advanced Monitoring Options

```typescript
// Monitor with sampling and filtering
const monitoredWithOptions = monitor({
  name: "expensiveOperation",
  sampleRate: 0.1, // Monitor only 10% of calls
  enabled: (args) => args[0] === "production", // Only monitor in production
  timeout: 5000, // Custom timeout for API calls
  retries: 2, // Custom retry count
  sanitize: true, // Enable data sanitization
  priority: "high", // High priority for batching
  tags: { team: "backend", service: "payments" },
  capture: ({ args, result }) => ({
    input: { operation: args[0] },
    output: { duration: result.duration },
    metadata: { server: "web-01", region: "us-east-1" },
  }),
  onError: (error, args) => ({
    input: { operation: args[0] },
    output: { error: error.message },
    metadata: { errorCode: error.code },
  }),
});
```

## Using Middleware

```typescript
import {
  addMiddleware,
  createLoggingMiddleware,
  createMetricsMiddleware,
  createRateLimitMiddleware,
  createValidationMiddleware,
  createCircuitBreakerMiddleware,
} from "@olakai/api-sdk";

// Add global middleware
addMiddleware(
  createLoggingMiddleware({
    level: "info",
    includeArgs: false,
    includeResult: false,
  }),
);

addMiddleware(createMetricsMiddleware("global"));

addMiddleware(
  createRateLimitMiddleware({
    maxCalls: 100,
    windowMs: 60000, // 1 minute
    keyGenerator: (args) => args[0], // Rate limit per first argument
  }),
);

addMiddleware(
  createValidationMiddleware({
    validateArgs: (args) => {
      if (!args[0] || typeof args[0] !== "string") {
        return "First argument must be a non-empty string";
      }
      return true;
    },
    validateResult: (result) => {
      if (!result || typeof result !== "object") {
        return "Result must be an object";
      }
      return true;
    },
  }),
);

addMiddleware(
  createCircuitBreakerMiddleware({
    failureThreshold: 5,
    resetTimeoutMs: 30000, // 30 seconds
  }),
);
```

## Metrics Collection

```typescript
import { getGlobalMetrics, createMetricsCollector } from "@olakai/api-sdk";

// Use global metrics
const globalMetrics = getGlobalMetrics();

// Get snapshot of all functions
const allMetrics = globalMetrics.getSnapshot();
console.log("All metrics:", allMetrics);

// Get metrics for specific function
const loginMetrics = globalMetrics.getSnapshot("userLogin");
console.log("Login success rate:", loginMetrics.successRate);
console.log("Average duration:", loginMetrics.averageDuration);

// Get performance percentiles
const percentiles = globalMetrics.getPercentiles("userLogin", [50, 90, 95, 99]);
console.log("P95 duration:", percentiles.p95);

// Get error patterns
const errorPatterns = globalMetrics.getErrorPatterns();
console.log("Common errors:", errorPatterns);

// Export all data for external analysis
const exportData = globalMetrics.exportData();
```

## Custom Middleware Example

```typescript
import { addMiddleware } from "@olakai/api-sdk";

// Create custom security middleware
const securityMiddleware = {
  name: "security",
  beforeCall: async (args) => {
    // Check authentication
    const token = getAuthToken();
    if (!token || isTokenExpired(token)) {
      throw new Error("Authentication required");
    }
    return args;
  },
  afterCall: async (result, args) => {
    // Log security events
    logSecurityEvent("function_called", { args, result });
    return result;
  },
  onError: async (error, args) => {
    // Log security errors
    logSecurityEvent("function_error", { error: error.message, args });
  },
};

addMiddleware(securityMiddleware);
```

## Batch Processing and Queue Management

```typescript
import { getQueueSize, flushQueue, clearQueue } from "@olakai/api-sdk";

// Check queue status
console.log("Current queue size:", getQueueSize());

// Force flush all pending requests
await flushQueue();

// Clear queue (useful for testing)
clearQueue();
```

## Error Handling and Debugging

```typescript
// Configure error handling
const config = createConfig()
  .apiKey("your-api-key")
  .debug(true) // Enable debug logging
  .onError((error) => {
    console.error("SDK Error:", error);
    // Send to your error tracking service
    errorTracker.capture(error);
  })
  .build();

initClient(config);
```

## Environment-Specific Configuration

```typescript
import { getEnvironment } from "@olakai/api-sdk";

const environment = getEnvironment();

const config = createConfig()
  .apiKey(process.env.OLAKAI_API_KEY!)
  .environment(environment)
  .debug(environment === "development")
  .batchSize(environment === "production" ? 50 : 5)
  .batchTimeout(environment === "production" ? 5000 : 1000)
  .build();

initClient(config);
```

## Data Sanitization

```typescript
import { DEFAULT_SANITIZE_PATTERNS, createConfig } from "@olakai/api-sdk";

// Use default sanitization patterns (emails, credit cards, SSNs, etc.)
const config = createConfig()
  .apiKey("your-api-key")
  .sanitizePatterns([
    ...DEFAULT_SANITIZE_PATTERNS,
    /\bprivate_key_\w+/g, // Custom pattern for private keys
    /\bsecret_\w+/g, // Custom pattern for secrets
  ])
  .build();

// Enable sanitization in monitor options
const monitored = monitor({
  name: "sensitiveOperation",
  sanitize: true, // This will use the configured sanitization patterns
  capture: ({ args, result }) => ({
    input: args[0],
    output: result,
  }),
});
```

## Integration Examples

### Express.js API Monitoring

```typescript
import express from "express";
import { monitor, initClient } from "@olakai/api-sdk";

initClient("your-api-key");

const app = express();

// Monitor API endpoints
const monitoredHandler = monitor({
  name: "apiEndpoint",
  capture: ({ args, result }) => ({
    input: {
      method: args[0].method,
      path: args[0].path,
      userId: args[0].user?.id,
    },
    output: {
      statusCode: args[1].statusCode,
      responseTime: result.responseTime,
    },
  }),
  onError: (error, args) => ({
    input: {
      method: args[0].method,
      path: args[0].path,
    },
    output: { error: error.message },
  }),
});

app.get(
  "/api/users/:id",
  monitoredHandler(async (req, res) => {
    const user = await getUserById(req.params.id);
    res.json(user);
    return { responseTime: Date.now() - req.startTime };
  }),
);
```

### Database Query Monitoring

```typescript
import { monitor } from "@olakai/api-sdk";

// Monitor database queries
const monitoredQuery = monitor({
  name: "databaseQuery",
  capture: ({ args, result }) => ({
    input: {
      query: args[0].substring(0, 100), // Truncate long queries
      params: args[1],
    },
    output: {
      rowCount: result.rows?.length || 0,
      duration: result.duration,
    },
  }),
  onError: (error, args) => ({
    input: { query: args[0].substring(0, 100) },
    output: { error: error.message, sqlState: error.code },
  }),
  tags: { layer: "database", type: "postgres" },
});

const executeQuery = monitoredQuery(async (sql: string, params: any[]) => {
  const start = Date.now();
  const result = await db.query(sql, params);
  return { ...result, duration: Date.now() - start };
});
```

### Real-time Monitoring Dashboard

```typescript
import { getGlobalMetrics } from "@olakai/api-sdk";

// Create a real-time monitoring dashboard
setInterval(() => {
  const metrics = getGlobalMetrics();
  const snapshot = metrics.getSnapshot();

  // Send to your dashboard
  dashboardUpdate({
    timestamp: new Date().toISOString(),
    metrics: Object.entries(snapshot).map(([name, data]) => ({
      name,
      calls: data.totalCalls,
      successRate: data.successRate,
      avgDuration: data.averageDuration,
      errorRate: data.errorRate,
      lastError: data.lastError,
    })),
  });
}, 10000); // Update every 10 seconds
```

## TypeScript Best Practices

```typescript
// Define strong types for your monitored functions
interface LoginArgs {
  email: string;
  password: string;
}

interface LoginResult {
  success: boolean;
  userId?: string;
  token?: string;
}

const typedMonitor = monitor<[LoginArgs], LoginResult>({
  name: "userLogin",
  capture: ({ args, result }) => ({
    input: { email: args[0].email },
    output: {
      success: result.success,
      userId: result.userId,
    },
  }),
  onError: (error, args) => ({
    input: { email: args[0].email },
    output: { error: error.message },
  }),
});
```

## Testing with the SDK

```typescript
import { clearQueue, getQueueSize } from "@olakai/api-sdk";

describe("Monitored functions", () => {
  beforeEach(() => {
    // Clear the queue before each test
    clearQueue();
  });

  it("should monitor function calls", async () => {
    const result = await monitoredFunction("test-input");

    expect(result).toBeDefined();
    expect(getQueueSize()).toBe(1); // One call was queued
  });
});
```

This SDK provides comprehensive monitoring capabilities with production-ready features like batching, retry logic, local storage, metrics collection, middleware support, and much more!
