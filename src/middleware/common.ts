import { Middleware } from "./index";
import { createLoggingMiddleware } from "./logging";
import { createRateLimitMiddleware } from "./rateLimiter";
import { createValidationMiddleware } from "./timeout";
import { createCircuitBreakerMiddleware } from "./circuitBreaker";

/**
 * Create a common middleware stack
 * Stack details: 
 * 1. Logging middleware
 * 2. Rate limiting middleware
 * 3. Validation middleware
 * 4. Circuit breaker middleware
 * See exports from ./middleware/index.ts for details on each middleware.
 * @param functionName - The name of the function to monitor. This is just for logging purposes.
 * @param options - The options for the middleware
 * @returns An array of middleware functions
 */
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