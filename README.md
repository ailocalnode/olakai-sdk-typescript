# Olakai SDK

A TypeScript SDK for monitoring function calls and controlling execution with real-time API decisions.

[![npm version](https://badge.fury.io/js/@olakai/api-sdk.svg)](https://badge.fury.io/js/@olakai/api-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

## Installation

```bash
npm install @olakai/api-sdk
```

## Quick Start

```typescript
import { initClient, monitor } from "@olakai/api-sdk";

// Initialize the SDK
await initClient("your-api-key", "https://your-olakai-domain.com");

// Monitor a function with type parameters: <[args], result>
const monitored = monitor<
  [string, string],
  { success: boolean; userId: string }
>({
  capture: ({ args, result }) => ({
    input: { email: args[0] },
    output: { success: result.success },
  }),
});

const loginUser = monitored(async (email: string, password: string) => {
  // Your login logic
  return { success: true, userId: "123" };
});

// Use it normally - monitoring happens automatically
await loginUser("user@example.com", "password");
```

## Core Features

### 📊 **Function Monitoring**

Automatically capture function inputs and outputs for analysis

### 🛡️ **Execution Control**

Block function execution based on real-time API decisions

### 🔧 **Middleware System**

Add cross-cutting concerns like logging, rate limiting, and validation

### 💾 **Offline Support**

Queue requests when offline, sync when connection is restored

### 🔒 **Data Sanitization**

Automatically remove sensitive data like passwords and API keys

---

## Simple Usage

### Basic Monitoring

```typescript
const monitoredFunction = monitor<
  [{ items: any[] }],
  { processed: boolean; count: number }
>({
  capture: ({ args, result }) => ({
    input: args[0],
    output: result,
  }),
});

const processData = monitoredFunction(async (data) => {
  return { processed: true, count: data.items.length };
});
```

### User and Session Tracking (Not totally implemented yet)

```typescript
const tracked = monitor<
  [{ userId: string; sessionId: string; action: string }],
  { success: boolean }
>({
  userId: (args) => args[0].userId,
  chatId: (args) => args[0].sessionId,
  capture: ({ args, result }) => ({
    input: { action: args[0].action },
    output: { success: result.success },
  }),
});
```

### Error Handling

```typescript
const resilient = monitor<[any], any>({
  capture: ({ args, result }) => ({
    input: args[0],
    output: result,
  }),
  onError: (error, args) => ({
    input: args[0],
    output: { error: error.message },
  }),
});
```

---

## Advanced Usage

### Execution Control

Block function execution based on real-time API decisions:

```typescript
const controlled = monitor<[string, string], { success: boolean }>({
  capture: ({ args, result }) => ({
    input: { userId: args[0], action: args[1] },
    output: result,
  }),
  control: {
    enabled: true,
    captureInput: (args) => ({
      userId: args[0],
      action: args[1],
      timestamp: Date.now(),
    }),
    onBlocked: (args, response) => {
      throw new Error(`Access denied: ${response.reason}`);
    },
  },
});

const sensitiveOperation = controlled(
  async (userId: string, action: string) => {
    // This only runs if the control API allows it
    return { success: true };
  }
);
```

### Sampling and Conditional Monitoring

```typescript
const sampled = monitor<[{ environment: string }], any>({
  enabled: (args) => args[0].environment === "production",
  sampleRate: 0.1, // Monitor 10% of calls
  capture: ({ args, result }) => ({
    input: args[0],
    output: result,
  }),
});
```

### Data Sanitization

```typescript
const secure = monitor<[{ email: string; password: string }], any>({
  sanitize: true, // Enables built-in sanitization
  capture: ({ args, result }) => ({
    input: {
      email: args[0].email,
      password: args[0].password, // Will be sanitized
    },
    output: result,
  }),
});
```

### Middleware

Add behavior to all monitored functions:

```typescript
import { addMiddleware, createLoggingMiddleware } from "@olakai/api-sdk";

// Add logging to all monitored functions
addMiddleware(createLoggingMiddleware({ level: "info" }));

// Custom middleware
addMiddleware({
  name: "timing",
  beforeCall: async (args) => {
    console.log("Function starting...");
    return args;
  },
  afterCall: async (result, args) => {
    console.log("Function completed");
    return result;
  },
});
```

---

## Configuration

### Basic Configuration

```typescript
await initClient("your-api-key", "https://your-domain.com", {
  timeout: 30000,
  retries: 3,
  debug: true,
});
```

### Advanced Configuration

```typescript
import { ConfigBuilder } from "@olakai/api-sdk";

const config = new ConfigBuilder()
  .apiKey("your-api-key")
  .domainUrl("https://your-domain.com")
  .batchSize(50)
  .batchTimeout(5000)
  .timeout(20000)
  .retries(3)
  .debug(true)
  .verbose(false)
  .sanitizePatterns([/password/gi, /api[_-]?key/gi, /secret/gi])
  .build();

await initClient(config.apiKey, config.domainUrl, config);
```

---

## API Reference

### Core Functions

#### `initClient(apiKey, domainUrl, options?)`

Initialize the SDK with your API credentials.

#### `monitor<TArgs, TResult>(options)`

Create a monitored version of a function with TypeScript generics.

**Type Parameters:**

- `TArgs` - Function arguments as a tuple type (e.g., `[string, number]`)
- `TResult` - Function return type (e.g., `{success: boolean}`)

**Options:**

- `capture`: Function to extract input/output data
- `onError`: Handle function errors
- `userId`: User identifier (string or function)
- `chatId`: Session identifier (string or function)
- `control`: Execution control configuration
- `sanitize`: Enable data sanitization
- `enabled`: Conditional monitoring
- `sampleRate`: Percentage of calls to monitor (0-1)

#### `addMiddleware(middleware)` / `removeMiddleware(name)`

Add or remove global middleware.

### Utilities

#### `getConfig()`

Get current SDK configuration.

#### `getQueueSize()` / `clearQueue()` / `flushQueue()`

Manage the request queue.

---

## Built-in Middleware

```typescript
import {
  createLoggingMiddleware,
  createRateLimitMiddleware,
  createCachingMiddleware,
  createTimeoutMiddleware,
} from "@olakai/api-sdk";

// Available middleware creators
addMiddleware(createLoggingMiddleware({ level: "info" }));
addMiddleware(createRateLimitMiddleware({ maxCalls: 100, windowMs: 60000 }));
addMiddleware(createCachingMiddleware({ ttlMs: 300000 }));
addMiddleware(createTimeoutMiddleware(30000));
```

---

## Examples

### Express.js API

```typescript
import express from "express";
import { initClient, monitor } from "@olakai/api-sdk";

await initClient(process.env.OLAKAI_API_KEY!, "https://api.olakai.com");

const app = express();

const apiMonitor = monitor<
  [any, any],
  { statusCode: number; duration: number }
>({
  userId: (args) => args[0].user?.id || "anonymous",
  capture: ({ args, result }) => ({
    input: {
      method: args[0].method,
      path: args[0].path,
      userAgent: args[0].get("User-Agent"),
    },
    output: {
      statusCode: result.statusCode,
      duration: result.duration,
    },
  }),
});

app.get(
  "/api/users/:id",
  apiMonitor(async (req, res) => {
    const start = Date.now();
    const user = await getUserById(req.params.id);
    res.json(user);
    return { statusCode: 200, duration: Date.now() - start };
  })
);
```

### Database Operations

```typescript
const dbMonitor = monitor<[string, any[]], { rows?: any[]; duration: number }>({
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
  control: {
    enabled: (args) => args[0].toLowerCase().includes("delete"),
    captureInput: (args) => ({
      queryType: "DELETE",
      table: extractTableName(args[0]),
    }),
  },
});

const executeQuery = dbMonitor(async (sql: string, params: any[]) => {
  const start = Date.now();
  const result = await database.query(sql, params);
  return { ...result, duration: Date.now() - start };
});
```

---

## Error Handling

The SDK is designed to never break your application. If monitoring fails:

- Your original function still executes normally
- Errors are logged (if debug mode is enabled)
- The global `onError` handler is called (if configured)

```typescript
await initClient("api-key", "domain", {
  debug: true, // Enable error logging
  onError: (error) => {
    console.error("Monitoring error:", error);
    // Send to your error tracking service
  },
});
```

---

## License

MIT © [Olakai](https://olakai.ai)
