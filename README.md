# Olakai SDK

A TypeScript SDK for tracking AI interactions with simple event-based API. Monitor your AI applications, track usage patterns, and enforce content policies with just a few lines of code.

[![npm version](https://badge.fury.io/js/@olakai%2Fsdk.svg)](https://badge.fury.io/js/@olakai%2Fsdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

## Why Use Olakai SDK?

- **AI Monitoring**: Track every AI interaction in your application
- **Content Control**: Automatically block sensitive or inappropriate content
- **Analytics**: Get insights into AI usage patterns and performance
- **Simple Integration**: Works with a simple event-based API - just call `olakai()`
- **Privacy-First**: Built-in data sanitization and user privacy controls
- **Production Ready**: Handles errors gracefully, works offline, retries automatically

## Installation

```bash
npm install @olakai/sdk
# or
yarn add @olakai/sdk
# or
pnpm add @olakai/sdk
```

## Quick Start

### 1. Initialize the SDK

```typescript
import { olakaiConfig } from "@olakai/sdk";

// Initialize once in your app
olakaiConfig({
  apiKey: "your-olakai-api-key",
  endpoint: "https://app.olakai.ai",
  debug: false, // Set to true for development
});
```

### 2. Track AI Events

```typescript
import { olakai } from "@olakai/sdk";

// Track any AI interaction
olakai("event", "ai_activity", {
  prompt: "Write a product description for wireless headphones",
  response:
    "Experience crystal-clear sound with our premium wireless headphones...",
  task: "Content Generation",
  email: "user@example.com",
  tokens: 150,
  chatId: "session-abc123", // Groups related interactions
  custom_dimensions: {
    dim1: "e-commerce",
    dim2: "product-description",
  },
  custom_metrics: {
    metric1: 150,
    metric2: 2.5,
  },
});
```

**That's it!** Your AI interactions are now being tracked and monitored.

## Real-World Examples

### E-commerce AI Assistant

```typescript
import { olakai } from "@olakai/sdk";

async function generateProductDescription(product: Product) {
  const prompt = `Write a compelling product description for: ${product.name}`;

  // Call your AI service
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });

  const description = response.choices[0].message.content;

  // Track the interaction
  olakai("event", "ai_activity", {
    prompt,
    response: description,
    task: "Product Description",
    subTask: "E-commerce",
    email: product.ownerEmail,
    tokens: response.usage?.total_tokens || 0,
    chatId: `product-${product.id}`,
    custom_dimensions: {
      dim1: product.category,
      dim2: product.brand,
      dim3: "gpt-4",
    },
    custom_metrics: {
      metric1: product.price,
      metric2: response.usage?.total_tokens || 0,
    },
  });

  return description;
}
```

### Customer Support Chatbot

```typescript
import { olakai } from "@olakai/sdk";

async function handleCustomerQuery(query: string, customerId: string) {
  const systemPrompt = "You are a helpful customer support agent...";

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ],
  });

  const answer = response.choices[0].message.content;

  // Track with customer context
  olakai("event", "ai_activity", {
    prompt: query,
    response: answer,
    task: "Customer Support",
    subTask: "Query Resolution",
    email: `customer-${customerId}@company.com`,
    tokens: response.usage?.total_tokens || 0,
    chatId: `support-${customerId}`,
    custom_dimensions: {
      dim1: "customer-support",
      dim2: "gpt-3.5-turbo",
      dim3: "tier-1",
    },
  });

  return answer;
}
```

### Content Moderation

```typescript
import { olakai, olakaiMonitor } from "@olakai/sdk";

// Wrap your AI function for automatic monitoring
const moderateContent = olakaiMonitor(
  async (content: string) => {
    const response = await openai.moderations.create({
      input: content,
    });

    return {
      flagged: response.results[0].flagged,
      categories: response.results[0].categories,
    };
  },
  {
    task: "Content Moderation",
    subTask: "Safety Check",
  },
);

// Use normally - monitoring happens automatically
try {
  const result = await moderateContent("User submitted content here...");
  // Content is safe
} catch (error) {
  if (error.name === "OlakaiBlockedError") {
    // Content was blocked by Olakai's control system
    console.log("Content blocked:", error.details);
  }
}
```

## API Reference

### `olakaiConfig(config)`

Initialize the SDK with your configuration.

```typescript
olakaiConfig({
  apiKey: string;        // Required: Your Olakai API key
  endpoint: string;       // Required: Your Olakai endpoint URL
  debug?: boolean;       // Optional: Enable debug logging (default: false)
});
```

### `olakai(eventType, eventName, params)`

Track AI events with simple event-based API.

```typescript
olakai("event", "ai_activity", {
  // Required
  prompt: string;         // The AI prompt/input
  response: string;      // The AI response/output

  // Optional - User & Session
  email?: string;        // User email for tracking
  chatId?: string;       // UUID to group related activities

  // Optional - Categorization
  task?: string;         // Task name (e.g., "Content Generation")
  subTask?: string;      // Sub-task name (e.g., "Blog Post")

  // Optional - Metrics
  tokens?: number;       // Token count used
  requestTime?: number;  // Request duration in milliseconds
  shouldScore?: boolean; // Whether to score this activity

  // Optional - Custom Data
  custom_dimensions?: {  // String dimensions for categorization
    dim1?: string;
    dim2?: string;
    dim3?: string;
    dim4?: string;
    dim5?: string;
    [key: string]: string | undefined;
  };
  custom_metrics?: {     // Numeric metrics for analysis
    metric1?: number;
    metric2?: number;
    metric3?: number;
    metric4?: number;
    metric5?: number;
    [key: string]: number | undefined;
  };
});
```

### `olakaiMonitor(fn, options)`

Wrap functions for automatic tracking.

```typescript
const monitoredFunction = olakaiMonitor(
  async (input: string) => {
    // Your AI logic here
    return await aiModel.generate(input);
  },
  {
    task: "Content Generation",
    subTask: "Blog Post",
    email: "user@example.com",
    chatId: "session-123",
  },
);
```

### `olakaiReport(prompt, response, options)`

Direct reporting without function wrapping.

```typescript
await olakaiReport("Generate a blog post", "Here's your blog post content...", {
  task: "Content Generation",
  email: "user@example.com",
  tokens: 150,
});
```

## Error Handling

### Content Blocking

When Olakai's control system blocks content, an `OlakaiBlockedError` is thrown:

```typescript
import { OlakaiBlockedError } from "@olakai/sdk";

try {
  const result = await monitoredFunction("sensitive content");
} catch (error) {
  if (error instanceof OlakaiBlockedError) {
    console.error("Content blocked:", error.details);

    // Handle different blocking reasons
    if (error.details.detectedSensitivity.includes("PII")) {
      // Handle personally identifiable information
    }
    if (!error.details.isAllowedPersona) {
      // Handle unauthorized user
    }
  }
}
```

### Error Details

The `OlakaiBlockedError` contains:

```typescript
{
  message: string;
  details: {
    detectedSensitivity: string[];  // ["PII", "PHI", "CODE", "SECRET"]
    isAllowedPersona: boolean;      // User authorization status
  };
}
```

## Best Practices

### 1. Use Meaningful Task Names

```typescript
// ✅ Good - Descriptive and hierarchical
olakai("event", "ai_activity", {
  prompt,
  response,
  task: "Customer Support",
  subTask: "Ticket Resolution",
  // ...
});

// ❌ Avoid - Too generic
olakai("event", "ai_activity", {
  prompt,
  response,
  task: "AI",
  // ...
});
```

### 2. Group Related Interactions

```typescript
// Use consistent chatId for related interactions
const sessionId = "chat-" + Date.now();

olakai("event", "ai_activity", {
  prompt: "What's the weather like?",
  response: "I can't check real-time weather...",
  chatId: sessionId,
  // ...
});

olakai("event", "ai_activity", {
  prompt: "What about tomorrow?",
  response: "I still can't check weather...",
  chatId: sessionId, // Same session
  // ...
});
```

### 3. Use Custom Dimensions for Analytics

```typescript
olakai("event", "ai_activity", {
  prompt,
  response,
  custom_dimensions: {
    dim1: "e-commerce", // Business domain
    dim2: "product-description", // Use case
    dim3: "gpt-4", // AI model
    dim4: "premium-tier", // User tier
  },
  custom_metrics: {
    metric1: productPrice, // Product value
    metric2: responseTime, // Performance
    metric3: tokenCount, // Cost
  },
});
```

### 4. Handle Errors Gracefully

```typescript
// Always wrap in try-catch for production
try {
  olakai("event", "ai_activity", params);
} catch (error) {
  // Log but don't break your app
  console.warn("Failed to track AI event:", error);
}
```

## Migration Guide

### From Previous Versions

If you're upgrading from an older version:

```typescript
// Old way (still works)
import { initClient, olakaiReport } from "@olakai/sdk";

initClient("api-key", "https://app.olakai.ai");
await olakaiReport(prompt, response, options);

// New way (recommended)
import { olakaiConfig, olakai } from "@olakai/sdk";

olakaiConfig({ apiKey: "api-key", endpoint: "https://app.olakai.ai" });
olakai("event", "ai_activity", { prompt, response, ...options });
```

### From Other Analytics Tools

```typescript
// Generic analytics tracking
analytics.track("ai_interaction", {
  custom_parameter: value,
});

// Olakai SDK
olakai("event", "ai_activity", {
  prompt: "user input",
  response: "ai output",
  custom_dimensions: {
    dim1: value,
  },
});
```

## Troubleshooting

### Common Issues

**"Events not being tracked"**

- Ensure `olakaiConfig()` was called first
- Check your API key and endpoint URL
- Enable debug mode to see detailed logs

**"TypeScript errors"**

- Make sure you're using TypeScript 4.0+
- The SDK uses automatic type inference

**"Performance concerns"**

- Tracking is asynchronous and won't block your app
- Use `olakai()` for fire-and-forget tracking
- Use `olakaiReport()` only when you need to await completion

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
olakaiConfig({
  apiKey: "your-key",
  endpoint: "https://app.olakai.ai",
  debug: true, // Shows detailed logs
});
```

## Support

- [Full Documentation](https://app.olakai.ai/docs/olakai)
- [Support Email](mailto:support@olakai.ai)
- [Report Issues](https://github.com/olakai/olakai-sdk-typescript/issues)

## License

MIT © [Olakai](https://olakai.ai)
