# Olakai SDK

A TypeScript SDK for monitoring function calls and controlling execution with real-time API decisions.

[![npm version](https://badge.fury.io/js/@olakai/api-sdk.svg)](https://badge.fury.io/js/@olakai/api-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

## Installation

```bash
npm install @olakai/api-sdk
```

## Quick Start - The Easy Way

```typescript
import { initClient, quickMonitor } from "@olakai/api-sdk";

// 1. Initialize once
await initClient("your-api-key", "https://your-olakai-domain.com");

// 2. Wrap any function - that's it!
const sayHello = quickMonitor(async (name: string) => {
  return `Hello, ${name}!`;
});

// 3. Use normally - monitoring happens automatically
const result = await sayHello("World");
console.log(result); // "Hello, World!"
```

**That's it!** Your function calls are now being monitored automatically. No complex configuration needed.
**What is does?** All inputs and outputs of the function are being sent to the API!

---

## 🚀 **Why Use Olakai SDK?**

### ✅ **Zero Configuration Monitoring**

Just wrap your functions and start monitoring immediately

### ✅ **Never Breaks Your Code**

If monitoring fails, your functions still work perfectly

### ✅ **Smart Type Inference**

TypeScript automatically figures out your function types

### ✅ **Production Ready**

Built-in error handling, retries, and offline support

---

## Simple Examples

### Monitor Any Function

```typescript
import { simpleMonitor } from "@olakai/api-sdk";

// Works with any function
const processOrder = simpleMonitor(
  async (orderId: string) => {
    // Your business logic
    return { success: true, orderId };
  },
  {
    task: "process-order", // Optional: give it a name
  }
);

await processOrder("order-123");
```

### Track Users (For Multi-User Apps)

```typescript
import { userMonitor } from "@olakai/api-sdk";

const loginUser = userMonitor(
  async (email: string, password: string) => {
    // Your login logic
    return { success: true, userId: "user-123" };
  },
  {
    task: "user-login",
    getUserId: (args) => args[0], // first argument is email
  }
);

await loginUser("user@example.com", "password");
```

---

## Common Patterns

### Capture Only What You Need

```typescript
import { simpleMonitor, capture } from "@olakai/api-sdk";

// Capture everything (default)
const monitorAll = simpleMonitor(myFunction, capture.all());

// Capture only inputs
const monitorInputs = simpleMonitor(myFunction, capture.input());

// Capture only outputs
const monitorOutputs = simpleMonitor(myFunction, capture.output());

// Custom capture
const monitorCustom = simpleMonitor(
  myFunction,
  capture.custom({
    input: (args) => ({ email: args[0] }),
    output: (result) => ({ success: result.success }),
  })
);
```

### Error Handling Made Easy

```typescript
const robustFunction = simpleMonitor(
  async (data: any) => {
    // This might throw an error
    return await riskyOperation(data);
  },
  {
    task: "risky-operation",
    onError: (error, args) => ({
      input: args[0],
      output: { error: error.message },
    }),
  }
);
```

---

## When You Need More Control

### Advanced Monitoring

Sometimes you need fine-grained control. The original `advancedMonitor` function is still available:

```typescript
import { monitor } from "@olakai/api-sdk";

const advancedMonitor = advancedMonitor({
  capture: ({ args, result }) => ({
    input: {
      email: args[0],
      requestTime: Date.now(),
    },
    output: {
      success: result.success,
      userId: result.userId,
    },
  }),
  userId: (args) => args[0], // dynamic user ID
  chatId: (args) => args[1], // session tracking
  sanitize: true, // remove sensitive data
  priority: "high", // queue priority
});

const loginUser = advancedMonitor(async (email: string, sessionId: string) => {
  return { success: true, userId: "123" };
});
```

### Execution Control

Block function execution based on real-time API decisions:

```typescript
const controlledFunction = advancedMonitor({
  capture: ({ args, result }) => ({
    input: { action: args[0] },
    output: result,
  }),
  control: {
    enabled: true,
    captureInput: (args) => ({ action: args[0] }),
    onBlocked: (args, response) => {
      throw new Error(`Access denied: ${response.reason}`);
    },
  },
});
```

### Middleware System

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

### Basic Setup

```typescript
import { initClient } from "@olakai/api-sdk";

await initClient("your-api-key", "https://your-domain.com");
```

### Advanced Configuration

```typescript
await initClient("your-api-key", "https://your-domain.com", {
  debug: true, // Enable error logging
  verbose: true, // Enable detailed logging
  onError: (error) => {
    console.error("Monitoring error:", error);
    // Send to your error tracking service
  },
  sanitizePatterns: [/password/gi, /secret/gi], // Remove sensitive data
  batchSize: 10, // Batch size for API calls
  retries: 3, // Number of retries for failed requests
});
```

---

## Tips & Best Practices

### ✅ **Do This**

- Start with `quickMonitor` or `simpleMonitor`
- Use descriptive task names
- Monitor important business logic functions
- Set up user tracking for multi-user apps

### ❌ **Avoid This**

- Don't monitor every tiny utility function
- Don't put sensitive data in task names
- Don't monitor authentication functions that handle passwords

### 🔒 **Security Notes**

- The SDK automatically sanitizes common sensitive patterns
- User IDs should be email addresses that match Olakai accounts
- Enable `sanitize: true` for functions handling sensitive data

---

## API Reference

### Simple Functions

| Function                      | Description               | Use Case                      |
| ----------------------------- | ------------------------- | ----------------------------- |
| `quickMonitor(name, fn)`      | Simplest monitoring       | Quick setup, just need a name |
| `simpleMonitor(fn, options?)` | Auto-capture with options | Most common use case          |
| `userMonitor(fn, options)`    | User tracking made easy   | Multi-user applications       |

### Helper Objects

| Helper             | Description            | Example                 |
| ------------------ | ---------------------- | ----------------------- |
| `capture.all()`    | Capture input + output | Default behavior        |
| `capture.input()`  | Capture only inputs    | Sensitive outputs       |
| `capture.output()` | Capture only outputs   | Sensitive inputs        |
| `capture.custom()` | Custom capture logic   | Complex data extraction |

### Utilities

- `getConfig()` - Get current SDK configuration
- `getQueueSize()` - Check request queue size
- `clearQueue()` - Clear pending requests
- `flushQueue()` - Send all queued requests immediately

---

## Troubleshooting

### Common Issues

**"Function not being monitored"**

- Check that `initClient()` was called first
- Verify your API key and domain URL
- Check browser console for errors (if debug: true)

**"TypeScript errors"**

- Make sure you're using TypeScript 4.0+
- The helpers use automatic type inference

**"Monitoring seems slow"**

- Monitoring happens asynchronously and shouldn't affect performance
- Use `priority: "low"` for non-critical functions
- Check network connectivity

### Debug Mode

```typescript
await initClient("key", "url", { debug: true, verbose: true });
```

This will log detailed information about what the SDK is doing.

---

## Examples Repository

Check out our [examples repository](https://github.com/olakai/sdk-examples) for complete working examples:

- Express.js REST API
- Next.js application
- Database monitoring
- Authentication flows
- Error handling patterns

---

## License

MIT © [Olakai](https://olakai.ai)

---

**Need help?**

- 📖 [Documentation](https://docs.olakai.ai)
- 💬 [Discord Community](https://discord.gg/olakai)
- 📧 [Support Email](mailto:support@olakai.ai)
