import { Middleware } from "../types";
import { createLoggingMiddleware } from "./logging";
import { createRateLimitMiddleware } from "./rateLimiter";
import { createValidationMiddleware } from "./timeout";
import { createCircuitBreakerMiddleware } from "./circuitBreaker";

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