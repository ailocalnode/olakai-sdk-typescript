import { Middleware } from "../types";

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