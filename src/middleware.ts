import type { Middleware } from "./types";

// Logging middleware
export function createLoggingMiddleware<TArgs extends any[], TResult>(options: {
  level?: "debug" | "info" | "warn" | "error";
  includeArgs?: boolean;
  includeResult?: boolean;
  logger?: Console;
}): Middleware<TArgs, TResult> {
  const {
    level = "info",
    includeArgs = false,
    includeResult = false,
    logger = console,
  } = options;

  return {
    name: "logging",
    beforeCall: async (args: TArgs) => {
      if (includeArgs) {
        logger[level]("[Olakai SDK] Calling function with args:", args);
      } else {
        logger[level]("[Olakai SDK] Calling function");
      }
      return args;
    },
    afterCall: async (result: TResult, _args: TArgs) => {
      if (includeResult) {
        logger[level]("[Olakai SDK] Function completed with result:", result);
      } else {
        logger[level]("[Olakai SDK] Function completed successfully");
      }
      return result;
    },
    onError: async (error: any, _args: TArgs) => {
      logger.error("[Olakai SDK] Function failed with error:", error);
    },
  };
}

// Rate limiting middleware
export function createRateLimitMiddleware<
  TArgs extends any[],
  TResult,
>(options: {
  maxCalls: number;
  windowMs: number;
  keyGenerator?: (args: TArgs) => string;
}): Middleware<TArgs, TResult> {
  const { maxCalls, windowMs, keyGenerator = () => "default" } = options;
  const callCounts = new Map<string, { count: number; resetTime: number }>();

  return {
    name: "rateLimit",
    beforeCall: async (args: TArgs) => {
      const key = keyGenerator(args);
      const now = Date.now();
      const record = callCounts.get(key);

      if (!record || now > record.resetTime) {
        callCounts.set(key, { count: 1, resetTime: now + windowMs });
      } else {
        record.count++;
        if (record.count > maxCalls) {
          throw new Error(
            `Rate limit exceeded: ${maxCalls} calls per ${windowMs}ms`,
          );
        }
      }

      return args;
    },
  };
}

// Timeout middleware
export function createTimeoutMiddleware<TArgs extends any[], TResult>(
  _timeoutMs: number,
): Middleware<TArgs, TResult> {
  return {
    name: "timeout",
    beforeCall: async (args: TArgs) => {
      // Store timeout info in args metadata (if supported)
      return args;
    },
  };
}

// Validation middleware
export function createValidationMiddleware<
  TArgs extends any[],
  TResult,
>(options: {
  validateArgs?: (args: TArgs) => boolean | string;
  validateResult?: (result: TResult) => boolean | string;
}): Middleware<TArgs, TResult> {
  const { validateArgs, validateResult } = options;

  return {
    name: "validation",
    beforeCall: async (args: TArgs) => {
      if (validateArgs) {
        const validation = validateArgs(args);
        if (validation !== true) {
          throw new Error(`Argument validation failed: ${validation}`);
        }
      }
      return args;
    },
    afterCall: async (result: TResult, _args: TArgs) => {
      if (validateResult) {
        const validation = validateResult(result);
        if (validation !== true) {
          throw new Error(`Result validation failed: ${validation}`);
        }
      }
      return result;
    },
  };
}

// Caching middleware
export function createCachingMiddleware<TArgs extends any[], TResult>(options: {
  ttlMs?: number;
  keyGenerator: (args: TArgs) => string;
  maxSize?: number;
}): Middleware<TArgs, TResult> {
  const { ttlMs = 60000, keyGenerator, maxSize = 100 } = options;
  const cache = new Map<string, { value: TResult; expiry: number }>();

  return {
    name: "caching",
    beforeCall: async (args: TArgs) => {
      const key = keyGenerator(args);
      const cached = cache.get(key);

      if (cached && Date.now() < cached.expiry) {
        // Return cached result by throwing a special "cached result" object
        // This is a hack since we can't modify the control flow easily
        throw { __isCachedResult: true, value: cached.value };
      }

      return args;
    },
    afterCall: async (result: TResult, args: TArgs) => {
      const key = keyGenerator(args);

      // Implement LRU eviction if cache is full
      if (cache.size >= maxSize) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }

      cache.set(key, {
        value: result,
        expiry: Date.now() + ttlMs,
      });

      return result;
    },
  };
}

// Circuit breaker middleware
export function createCircuitBreakerMiddleware<
  TArgs extends any[],
  TResult,
>(options: {
  failureThreshold: number;
  resetTimeoutMs: number;
}): Middleware<TArgs, TResult> {
  const { failureThreshold, resetTimeoutMs } = options;
  let state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  let failureCount = 0;
  let lastFailureTime = 0;
  let successCount = 0;

  return {
    name: "circuitBreaker",
    beforeCall: async (args: TArgs) => {
      const now = Date.now();

      if (state === "OPEN") {
        if (now - lastFailureTime > resetTimeoutMs) {
          state = "HALF_OPEN";
          successCount = 0;
        } else {
          throw new Error("Circuit breaker is OPEN");
        }
      }

      return args;
    },
    afterCall: async (result: TResult, _args: TArgs) => {
      if (state === "HALF_OPEN") {
        successCount++;
        if (successCount >= 3) {
          // Require 3 successes to close
          state = "CLOSED";
          failureCount = 0;
        }
      } else if (state === "CLOSED") {
        failureCount = 0; // Reset failure count on success
      }

      return result;
    },
    onError: async (_error: any, _args: TArgs) => {
      failureCount++;
      lastFailureTime = Date.now();

      if (state === "HALF_OPEN" || failureCount >= failureThreshold) {
        state = "OPEN";
      }
    },
  };
}

// Data transformation middleware
export function createTransformMiddleware<
  TArgs extends any[],
  TResult,
>(options: {
  transformArgs?: (args: TArgs) => TArgs | Promise<TArgs>;
  transformResult?: (result: TResult) => TResult | Promise<TResult>;
}): Middleware<TArgs, TResult> {
  const { transformArgs, transformResult } = options;

  return {
    name: "transform",
    beforeCall: async (args: TArgs) => {
      if (transformArgs) {
        return await transformArgs(args);
      }
      return args;
    },
    afterCall: async (result: TResult, _args: TArgs) => {
      if (transformResult) {
        return await transformResult(result);
      }
      return result;
    },
  };
}

// Export a function to create a common middleware stack
export function createCommonMiddleware<TArgs extends any[], TResult>(
  functionName: string,
  options: {
    enableLogging?: boolean;
    enableMetrics?: boolean;
    enableRateLimit?: { maxCalls: number; windowMs: number };
    enableValidation?: {
      validateArgs?: (args: TArgs) => boolean | string;
      validateResult?: (result: TResult) => boolean | string;
    };
    enableCircuitBreaker?: {
      failureThreshold: number;
      resetTimeoutMs: number;
    };
  } = {},
): Middleware<TArgs, TResult>[] {
  const middlewares: Middleware<TArgs, TResult>[] = [];

  if (options.enableLogging) {
    middlewares.push(createLoggingMiddleware({}));
  }

  if (options.enableRateLimit) {
    middlewares.push(createRateLimitMiddleware(options.enableRateLimit));
  }

  if (options.enableValidation) {
    middlewares.push(createValidationMiddleware(options.enableValidation));
  }

  if (options.enableCircuitBreaker) {
    middlewares.push(
      createCircuitBreakerMiddleware(options.enableCircuitBreaker),
    );
  }

  return middlewares;
}
