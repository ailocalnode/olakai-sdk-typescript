import { Middleware } from "../types";

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