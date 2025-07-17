# Olakai SDK

A TypeScript SDK for monitoring function calls and controlling execution with real-time API decisions.

[![npm version](https://badge.fury.io/js/@olakai/api-sdk.svg)](https://badge.fury.io/js/@olakai/api-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

## Installation

```bash
npm install olakai-sdk
```

## Quick Start - The Easy & Fast Way

```typescript
import { initClient, quickMonitor } from "@olakai/api-sdk";

// 1. Initialize once
initClient("your-api-key", "https://your-olakai-domain.com");

// 2. Wrap any function - that's it!
const sayHello = simpleMonitor(async (name: string) => {
  return `Hello, ${name}!`;
});

// 3. Use normally - monitoring happens automatically
const result = await sayHello("World");
console.log(result); // "Hello, World!"
```

**That's it!** Your function calls are now being monitored automatically. No complex configuration needed.

**What it does?** All inputs and outputs of the function are being sent to the API!

**How?** The inputs will be displayed as the "prompt" and the return object as the "response". (in the UNO product)

<details>
<summary><strong>🤖 Real Example: OpenAI API Call (Click to expand)</strong></summary>

See how easy it is to add monitoring to an existing OpenAI API call:

**Before (without monitoring):**

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateResponse(prompt: string) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });

  return completion.choices[0].message.content;
}

// Usage
const response = await generateResponse("Explain quantum computing");
```

**After (with monitoring):**

```typescript
import OpenAI from "openai";
import { initClient, quickMonitor } from "@olakai/api-sdk";

// Initialize Olakai SDK
initClient("your-olakai-api-key", "https://your-domain.com");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Just wrap your function - that's the only change!
const generateResponse = simpleMonitor(async (prompt: string) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
  });

  return completion.choices[0].message.content;
});

// Usage (exactly the same)
const response = await generateResponse("Explain quantum computing");
```

**What you get:**

- ✅ Every prompt and response is automatically logged to Olakai
- ✅ Token usage and response times are tracked
- ✅ No changes to your existing code logic
- ✅ If monitoring fails, your function still works perfectly
</details>

<details>
<summary><strong>Alternative: Monitor just the API call</strong></summary>

```typescript
import OpenAI from "openai";
import { initClient, quickMonitor } from "@olakai/api-sdk";

initClient("your-olakai-api-key", "https://your-domain.com");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create a monitored version of the API call
const monitoredCompletion = simpleMonitor(async (messages: any[]) => {
  return await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
  });
});

async function generateResponse(prompt: string) {
  // Use the monitored API call
  const completion = await monitoredCompletion([
    { role: "user", content: prompt },
  ]);

  return completion.choices[0].message.content;
}
```

_This approach lets you monitor specific API calls while keeping your business logic separate._

</details>

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
    task: "Customer service", // Optional: give it a task
    subtask: "process-order", // Optional: give it a subtask
  }
);

await processOrder("order-123");
```

**What it does?** The difference here, is that you can pass additionnal options, like subtask and task if you want your Olakai's calls to be specific! This helps for analytics generation!

### Track Users (For Multi-User Apps)

```typescript
import { simpleMonitor } from "@olakai/api-sdk";

// Works with any function
const processOrder = simpleMonitor(
  async (orderId: string) => {
    // Your business logic
    return { success: true, orderId };
  },
  {
    task: "Customer service", // Optional: give it a task
    subtask: "process-order", // Optional: give it a subtask
    getUserId: "example@olakai.ai" | ((args) => string) //Optional: You can pass a string or a function that will fetch the userId!
    getChatId: "123" | ((args) => string) //Optional: You can pass a string or a function that will fetch the chatId!
  }
);

await processOrder("order-123");
```

**What it does?** This feature lets you specify a userId, so our API can associate each call with a specific user. Instead of seeing "Anonymous user" in the UNO product's prompts panel, you'll see the actual user linked to each call. For now the matching is baed on users' email.

### Obtain Scoring of the Prompt

```typescript
import { simpleMonitor } from "@olakai/api-sdk";

// Works with any function
const processOrder = simpleMonitor(
  async (orderId: string) => {
    // Your business logic
    return { success: true, orderId };
  },
  {
    task: "Customer service", // Optional: give it a task
    subtask: "process-order", // Optional: give it a subtask
    getUserId: "example@olakai.ai" | ((args) => string), //Optional: You can pass a string or a function that will fetch the userId!
    getChatId: "123" | ((args) => string), //Optional: You can pass a string or a function that will fetch the chatId!
    shouldScore: true,
  }
);

await processOrder("order-123");
```

**What it does?** This feature lets you specify if the "prompt" (so the args of the function you monitor), should get a "prompting score", the same way Olakai is doing it for standard prompts in the UNO product.

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

Sometimes you need fine-grained control. The `advancedMonitor` function gives you full access to all monitoring options:

```typescript
import { advancedMonitor } from "@olakai/api-sdk";

const testFunction = advancedMonitor(
  async... ,
  options: MonitorOptions
)

```

<details>
<summary><strong>MonitorOptions type</strong></summary>

```typescript
export type MonitorOptions<TArgs extends any[], TResult> = {
  task?: string;
  subTask?: string;
  shouldScore?: boolean;
  capture: (ctx: { args: TArgs; result: TResult }) => {
    input: any;
    output: any;
  };
  onError?: (
    error: any,
    args: TArgs
  ) => {
    input: any;
    output: any;
  };
  // Dynamic chat and user identification
  chatId?: string | ((args: TArgs) => string);
  userId?: string | ((args: TArgs) => string);
  sanitize?: boolean; // Whether to sanitize sensitive data
  priority?: "low" | "normal" | "high"; // Priority for batching
  control?: ControlOptions<TArgs>; // Control configuration
};
```

</details>

```typescript
import { advancedMonitor } from "@olakai/api-sdk";

const loginUser = advancedMonitor(
  async (email: string, sessionId: string) => {
    // Your login logic
    return { success: true, userId: "123" };
  },
  {
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
    task: "Authentication",
    subTask: "user-login",
  }
);

await loginUser("user@example.com", "session-123");
```

### Execution Control

Block function execution based on real-time API decisions:

```typescript
const controlledFunction = advancedMonitor(
  async (action: string) => {
    // This only runs if the control API allows it
    return { success: true, action };
  },
  {
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
  }
);

await controlledFunction("sensitive-operation");
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

### Setup

```typescript
import { initClient } from "@olakai/api-sdk";

initClient("your-olakai-api-key", "https://your-domain.com");
```

### Debug Mode

```typescript
initClient("your-olakai-api-key", "https://your-domain.com", {
  debug: true,
  verbose: true,
});
```

This will log detailed information about what the SDK is doing.

---

## Tips & Best Practices

### ✅ **Do This**

- Start with `simpleMonitor`
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
- 📧 [Support Email](mailto:support@olakai.ai)
