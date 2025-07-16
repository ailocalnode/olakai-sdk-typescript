# 🚀 Olakai SDK

> **Advanced Function Monitoring & Control Platform**

A powerful TypeScript SDK for comprehensive function monitoring, intelligent execution control, and real-time observability. Built for modern applications that need bulletproof monitoring and smart execution controls.

[![npm version](https://badge.fury.io/js/@olakai/api-sdk.svg)](https://badge.fury.io/js/@olakai/api-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

---

## ✨ Features

🎯 **Smart Function Monitoring** - Advanced monitoring with sampling, filtering, and batching  
🛡️ **Execution Control** - Real-time function blocking and permission controls  
🔧 **Powerful Middleware** - Extensible middleware system with built-in components  
🔒 **Data Security** - Advanced sanitization and privacy protection  
📊 **Real-time Analytics** - Comprehensive metrics and observability  
💾 **Hybrid Storage** - Auto-adapting storage (memory/file/browser) for any environment  
⚡ **High Performance** - Optimized for production workloads  
🌐 **Framework Agnostic** - Works with any TypeScript/JavaScript application

---

## 📦 Installation

```bash
npm install @olakai/api-sdk
# or
yarn add @olakai/api-sdk
# or
pnpm add @olakai/api-sdk
```

---

## 🚀 Quick Start

```typescript
import { initClient, monitor, createConfig } from "@olakai/api-sdk";

// Initialize the SDK
initClient("your-api-key", "your-domain-url");

// Monitor a function
const monitored = monitor({
  name: "userLogin",
  capture: ({ args, result }) => ({
    input: { email: args[0] },
    output: { success: result.success, userId: result.userId },
  }),
});

const loginUser = monitored(async (email: string, password: string) => {
  // Your login logic here
  return { success: true, userId: "123" };
});
```

---

## 🔧 Configuration

### Basic Configuration

```typescript
import { initClient, createConfig } from "@olakai/api-sdk";

// Advanced configuration
const config = createConfig()
  .apiKey("your-api-key")
  .apiUrl("https://api.your-domain.com")
  .environment("production")
  .version("1.0.0")
  .batchSize(50)
  .batchTimeout(5000)
  .retries(3)
  .timeout(20000)
  .debug(true)
  .verbose(true)
  .build();

initClient(config);
```

### Environment-Specific Setup

```typescript
const environment = process.env.NODE_ENV || "development";

const config = createConfig()
  .apiKey(process.env.OLAKAI_API_KEY!)
  .environment(environment)
  .debug(environment === "development")
  .batchSize(environment === "production" ? 100 : 10)
  .batchTimeout(environment === "production" ? 10000 : 2000)
  .sanitizePatterns([
    ...DEFAULT_SANITIZE_PATTERNS,
    /\bprivate_key_\w+/g,
    /\bsecret_\w+/g,
  ])
  .onError((error) => {
    console.error("Olakai SDK Error:", error);
  })
  .build();

initClient(config);
```

---

## 🎯 Function Monitoring

### Basic Monitoring

```typescript
import { monitor } from "@olakai/api-sdk";

const monitored = monitor({
  name: "dataProcessor",
  // Dynamic user identification
  userId: (args) => args[0].userId || "anonymous",
  chatId: (args) => args[0].sessionId || "default",
  // Capture function input/output
  capture: ({ args, result }) => ({
    input: { operation: args[0].type, data: args[0].payload },
    output: { success: result.success, processedCount: result.count },
    metadata: { server: "api-01", region: "us-east-1" },
  }),
  // Handle errors gracefully
  onError: (error, args) => ({
    input: { operation: args[0].type },
    output: { error: error.message },
    metadata: { errorCode: error.code },
  }),
});

const processData = monitored(async (request: DataRequest) => {
  // Your processing logic
  return { success: true, count: 42 };
});
```

### Advanced Monitoring Options

```typescript
const advanced = monitor({
  name: "criticalOperation",
  // Sampling - monitor only 25% of calls
  sampleRate: 0.25,
  // Conditional monitoring
  enabled: (args) => args[0].environment === "production",
  // Performance & reliability
  timeout: 30000,
  retries: 5,
  priority: "high",
  // Security
  sanitize: true,
  // Metadata & filtering
  tags: {
    team: "platform",
    service: "payments",
    criticality: "high",
  },
  capture: ({ args, result }) => ({
    input: args[0],
    output: result,
    metadata: {
      timestamp: new Date().toISOString(),
      version: "2.1.0",
    },
  }),
});
```

---

## 🛡️ Execution Control

> **NEW FEATURE** - Real-time function execution control and blocking

Control function execution based on real-time API decisions. Perfect for implementing dynamic rate limiting, security controls, and business logic enforcement.

### Basic Control Setup

```typescript
const controlled = monitor({
  name: "sensitiveOperation",
  // Regular monitoring
  capture: ({ args, result }) => ({
    input: { userId: args[0], action: args[1] },
    output: { success: result.success },
  }),
  // Execution control
  control: {
    enabled: true,
    captureInput: (args) => ({
      userId: args[0],
      action: args[1],
      timestamp: Date.now(),
    }),
    // Handle blocked execution
    onBlocked: (args, response) => {
      console.log(`Action blocked for user ${args[0]}: ${response.reason}`);
      throw new Error(`Access denied: ${response.reason}`);
    },
    // Handle control API errors
    onError: (error, args) => {
      console.warn("Control check failed, allowing execution:", error.message);
      return true; // Allow execution on control API failure
    },
    // Control API configuration
    endpoint: "https://control.yourapi.com/check",
    timeout: 5000,
    retries: 2,
    sanitize: true,
    priority: "high",
  },
});

const performSensitiveAction = controlled(
  async (userId: string, action: string) => {
    // This function will only execute if the control API allows it
    return { success: true, result: "Action completed" };
  }
);
```

### Advanced Control Patterns

```typescript
// Dynamic control based on user role
const roleBasedControl = monitor({
  name: "adminOperation",
  control: {
    enabled: (args) => args[0].role !== "admin", // Only check non-admins
    captureInput: (args) => ({
      userId: args[0].id,
      role: args[0].role,
      operation: args[1],
      requestedAt: new Date().toISOString(),
    }),
    onBlocked: (args, response) => {
      // Custom blocking behavior
      logSecurityEvent("blocked_operation", {
        user: args[0].id,
        operation: args[1],
        reason: response.reason,
      });
      throw new UnauthorizedError(response.reason);
    },
  },
  capture: ({ args, result }) => ({
    input: { user: args[0].id, operation: args[1] },
    output: result,
  }),
});
```

---

## 🔧 Middleware System

> **ENHANCED** - Powerful middleware framework for cross-cutting concerns

Add behavior to all monitored functions with our flexible middleware system.

### Built-in Middleware

```typescript
import {
  addMiddleware,
  createLoggingMiddleware,
  createRateLimitMiddleware,
  createValidationMiddleware,
  createCachingMiddleware,
  createTimeoutMiddleware,
} from "@olakai/api-sdk";

// Logging middleware
addMiddleware(
  createLoggingMiddleware({
    level: "info",
    includeArgs: false,
    includeResult: true,
    logger: console,
  })
);

// Rate limiting middleware
addMiddleware(
  createRateLimitMiddleware({
    maxCalls: 100,
    windowMs: 60000, // 1 minute
    keyGenerator: (args) => args[0]?.userId || "anonymous",
  })
);

// Input/Output validation
addMiddleware(
  createValidationMiddleware({
    validateArgs: (args) => {
      if (!args[0] || typeof args[0] !== "object") {
        return "First argument must be an object";
      }
      return true;
    },
    validateResult: (result) => {
      if (!result || typeof result.success !== "boolean") {
        return "Result must have a success property";
      }
      return true;
    },
  })
);

// Caching middleware
addMiddleware(
  createCachingMiddleware({
    ttlMs: 300000, // 5 minutes
    maxSize: 1000,
    keyGenerator: (args) => `cache_${JSON.stringify(args[0])}`,
  })
);
```

### Custom Middleware

```typescript
import { addMiddleware, removeMiddleware } from "@olakai/api-sdk";

// Security middleware
const securityMiddleware = {
  name: "security",
  beforeCall: async (args) => {
    const token = extractAuthToken(args);
    if (!token || !(await validateToken(token))) {
      throw new AuthenticationError("Invalid or missing token");
    }

    // Enhance args with user context
    const user = await getUserFromToken(token);
    return [{ ...args[0], user }, ...args.slice(1)];
  },
  afterCall: async (result, args) => {
    // Log successful operations
    await auditLog.success({
      userId: args[0].user.id,
      operation: args[0].operation,
      result: result.success,
    });
    return result;
  },
  onError: async (error, args) => {
    // Log failed operations
    await auditLog.error({
      userId: args[0].user?.id,
      operation: args[0].operation,
      error: error.message,
    });
  },
};

addMiddleware(securityMiddleware);

// Remove middleware when needed
removeMiddleware("security");
```

### Middleware Composition

```typescript
// Performance monitoring middleware
const performanceMiddleware = {
  name: "performance",
  beforeCall: async (args) => {
    // Add timing metadata
    return [...args, { __startTime: Date.now() }];
  },
  afterCall: async (result, args) => {
    const startTime = args[args.length - 1].__startTime;
    const duration = Date.now() - startTime;

    // Report slow operations
    if (duration > 5000) {
      await alerting.slowOperation({
        function: "unknown",
        duration,
        args: args.slice(0, -1),
      });
    }

    return { ...result, __duration: duration };
  },
};

addMiddleware(performanceMiddleware);
```

---

## 🔒 Data Security & Sanitization

> **ENHANCED** - Advanced data protection and privacy controls

### Built-in Sanitization Patterns

```typescript
import { DEFAULT_SANITIZE_PATTERNS, createConfig } from "@olakai/api-sdk";

const config = createConfig()
  .apiKey("your-api-key")
  .sanitizePatterns([
    ...DEFAULT_SANITIZE_PATTERNS, // Emails, credit cards, SSNs, passwords, etc.
    // Custom patterns
    /\bprivate_key_\w+/g,
    /\bsecret_\w+/g,
    /\btoken_[a-zA-Z0-9]+/g,
    /\b[A-Z0-9]{32,}\b/g, // API keys
  ])
  .build();

initClient(config);
```

### Function-Level Sanitization

```typescript
const monitored = monitor({
  name: "paymentProcessor",
  sanitize: true, // Enable sanitization for this function
  capture: ({ args, result }) => ({
    input: {
      userId: args[0].userId,
      amount: args[0].amount,
      paymentMethod: args[0].paymentMethod, // Credit card will be sanitized
      metadata: args[0].metadata,
    },
    output: {
      transactionId: result.transactionId,
      status: result.status,
    },
  }),
});
```

### Custom Sanitization

```typescript
// Custom sanitization function
function customSanitize(data: any): any {
  const serialized = JSON.stringify(data);

  // Remove specific sensitive patterns
  const sanitized = serialized
    .replace(/\"ssn\":\s*\"[^\"]*\"/g, '"ssn":"[REDACTED]"')
    .replace(/\"creditCard\":\s*\"[^\"]*\"/g, '"creditCard":"[REDACTED]"')
    .replace(/\"password\":\s*\"[^\"]*\"/g, '"password":"[REDACTED]"');

  return JSON.parse(sanitized);
}

// Apply custom sanitization in capture
const monitored = monitor({
  name: "userRegistration",
  capture: ({ args, result }) => {
    const input = customSanitize(args[0]);
    const output = customSanitize(result);

    return { input, output };
  },
});
```

---

## 🏗️ Integration Examples

### Express.js API

```typescript
import express from "express";
import { monitor, initClient, addMiddleware } from "@olakai/api-sdk";

initClient(process.env.OLAKAI_API_KEY!);

const app = express();

// Global API middleware
addMiddleware({
  name: "apiLogging",
  beforeCall: async (args) => {
    const [req] = args;
    console.log(`${req.method} ${req.path} - ${req.ip}`);
    return args;
  },
});

// Monitor API endpoints
const apiMonitor = monitor({
  name: "apiEndpoint",
  userId: (args) => args[0].user?.id || "anonymous",
  chatId: (args) => args[0].sessionID || "no-session",
  capture: ({ args, result }) => ({
    input: {
      method: args[0].method,
      path: args[0].path,
      query: args[0].query,
      userAgent: args[0].get("User-Agent"),
    },
    output: {
      statusCode: result.statusCode,
      responseTime: result.duration,
    },
  }),
  control: {
    enabled: true,
    captureInput: (args) => ({
      userId: args[0].user?.id,
      endpoint: args[0].path,
      method: args[0].method,
      ip: args[0].ip,
    }),
  },
});

app.get(
  "/api/users/:id",
  apiMonitor(async (req, res) => {
    const startTime = Date.now();
    const user = await getUserById(req.params.id);
    const duration = Date.now() - startTime;

    res.json(user);
    return { statusCode: 200, duration };
  })
);
```

### Database Operations

```typescript
import { monitor } from "@olakai/api-sdk";

const dbMonitor = monitor({
  name: "databaseQuery",
  capture: ({ args, result }) => ({
    input: {
      query: args[0].substring(0, 200), // Truncate long queries
      params: args[1],
      database: args[2] || "default",
    },
    output: {
      rowCount: result.rows?.length || 0,
      affectedRows: result.affectedRows || 0,
      duration: result.duration,
    },
    metadata: {
      queryType: args[0].trim().split(" ")[0].toUpperCase(),
      timestamp: new Date().toISOString(),
    },
  }),
  control: {
    enabled: (args) => args[0].toLowerCase().includes("delete"),
    captureInput: (args) => ({
      queryType: "DELETE",
      table: extractTableName(args[0]),
      conditions: extractWhereClause(args[0]),
    }),
  },
  tags: { layer: "database", type: "postgresql" },
});

const executeQuery = dbMonitor(
  async (sql: string, params: any[], db = "main") => {
    const start = Date.now();
    const result = await database.query(sql, params);
    return { ...result, duration: Date.now() - start };
  }
);
```

### Microservices Communication

```typescript
const serviceMonitor = monitor({
  name: "serviceCall",
  capture: ({ args, result }) => ({
    input: {
      service: args[0],
      method: args[1],
      payload: args[2],
    },
    output: {
      status: result.status,
      latency: result.latency,
      dataSize: JSON.stringify(result.data).length,
    },
    metadata: {
      sourceService: process.env.SERVICE_NAME,
      targetService: args[0],
      correlationId: args[3]?.correlationId,
    },
  }),
  control: {
    enabled: true,
    captureInput: (args) => ({
      sourceService: process.env.SERVICE_NAME,
      targetService: args[0],
      method: args[1],
      circuitBreakerState: getCircuitBreakerState(args[0]),
    }),
  },
});

const callService = serviceMonitor(
  async (service: string, method: string, payload: any, options: any = {}) => {
    const start = Date.now();
    const response = await serviceClient.call(
      service,
      method,
      payload,
      options
    );
    return {
      ...response,
      latency: Date.now() - start,
    };
  }
);
```

---

## 🎛️ Advanced Configuration

### Dynamic Configuration

```typescript
import { getConfig, updateConfig } from "@olakai/api-sdk";

// Runtime configuration updates
const updateConfigBasedOnLoad = () => {
  const currentLoad = getSystemLoad();
  const config = getConfig();

  if (currentLoad > 0.8) {
    // Reduce batch size under high load
    updateConfig({
      batchSize: Math.max(config.batchSize! / 2, 5),
      batchTimeout: config.batchTimeout! * 2,
    });
  }
};

setInterval(updateConfigBasedOnLoad, 60000);
```

### Multi-Region Setup

```typescript
const regions = {
  "us-east-1": "https://api-us-east.olakai.ai",
  "eu-west-1": "https://api-eu-west.olakai.ai",
  "ap-southeast-1": "https://api-ap-se.olakai.ai",
};

const region = process.env.AWS_REGION || "us-east-1";

const config = createConfig()
  .apiKey(process.env.OLAKAI_API_KEY!)
  .apiUrl(regions[region])
  .environment(process.env.NODE_ENV!)
  .version(process.env.APP_VERSION!)
  .build();

initClient(config);
```

---

## 🛠️ Troubleshooting

### Common Issues

#### High Memory Usage

```typescript
// Reduce batch size and timeout
const config = createConfig()
  .batchSize(25) // Default: 50
  .batchTimeout(3000) // Default: 5000
  .maxLocalStorageSize(500000) // Default: 1MB
  .build();
```

#### Network Timeouts

```typescript
// Increase timeouts and retries
const config = createConfig()
  .timeout(30000) // Default: 20000
  .retries(5) // Default: 3
  .build();
```

#### Debug Mode

```typescript
const config = createConfig()
  .debug(true)
  .verbose(true)
  .onError((error) => {
    console.error("SDK Error:", error);
    // Send to error tracking
  })
  .build();
```

---

## 📚 API Reference

### Core Functions

- `initClient(apiKey, domainUrl?, config?)` - Initialize the SDK
- `monitor(options)(fn)` - Monitor a function
- `addMiddleware(middleware)` - Add global middleware
- `removeMiddleware(name)` - Remove middleware by name

### Utility Functions

- `getConfig()` - Get current configuration
- `getQueueSize()` - Get pending requests count
- `flushQueue()` - Force send all pending requests
- `clearQueue()` - Clear all pending requests

### Built-in Middleware

- `createLoggingMiddleware(options)` - Function call logging
- `createRateLimitMiddleware(options)` - Rate limiting
- `createValidationMiddleware(options)` - Input/output validation
- `createCachingMiddleware(options)` - Response caching
- `createTimeoutMiddleware(timeoutMs)` - Execution timeouts

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

---

## 📄 License

MIT © [Olakai](https://olakai.ai)

---

## 🔗 Links

- [Documentation](https://docs.olakai.ai)
- [API Reference](https://api.olakai.ai/docs)
- [Support](https://support.olakai.ai)
- [Changelog](CHANGELOG.md)

---

<div align="center">
  <strong>Built with ❤️ for modern applications</strong>
</div>
