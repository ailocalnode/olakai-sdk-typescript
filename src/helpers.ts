/**
 * Helper functions to make monitoring easier and more intuitive
 */

import { advancedMonitor } from "./monitor";
import type { MonitorOptions } from "./types";

/**
 * Capture helpers - common patterns for monitoring data
 */
export const capture = {
  /**
   * Capture everything - both full input and output
   */
  all: <TArgs extends any[], TResult>(options?: { 
    userId?: string | ((args: TArgs) => string),
    chatId?: string | ((args: TArgs) => string),
    task?: string,
    subTask?: string
  }) => ({
    capture: ({ args, result }: { args: TArgs; result: TResult }) => ({
      input: args.length === 1 ? args[0] : args,
      output: result,
    }),
    ...options,
  }),

  /**
   * Capture only the input/arguments
   */
  input: <TArgs extends any[], TResult>(options?: { 
    userId?: string | ((args: TArgs) => string),
    chatId?: string | ((args: TArgs) => string),
    task?: string,
    subTask?: string
  }) => ({
    capture: ({ args }: { args: TArgs; result: TResult }) => ({
      input: args.length === 1 ? args[0] : args,
      output: "Function executed successfully",
    }),
    ...options,
  }),

  /**
   * Capture only the output/result
   */
  output: <TArgs extends any[], TResult>(options?: { 
    userId?: string | ((args: TArgs) => string),
    chatId?: string | ((args: TArgs) => string),
    task?: string,
    subTask?: string
  }) => ({
    capture: ({ result }: { args: TArgs; result: TResult }) => ({
      input: "Function called",
      output: result,
    }),
    ...options,
  }),

  /**
   * Custom capture with simple input/output functions
   */
  custom: <TArgs extends any[], TResult>(config: {
    input: (args: TArgs) => any,
    output: (result: TResult) => any,
    userId?: string | ((args: TArgs) => string),
    chatId?: string | ((args: TArgs) => string),
    task?: string,
    subTask?: string
  }) => ({
    capture: ({ args, result }: { args: TArgs; result: TResult }) => ({
      input: config.input(args),
      output: config.output(result),
    }),
    userId: config.userId,
    chatId: config.chatId,
    task: config.task,
    subTask: config.subTask,
  }),
};

/**
 * Simple monitor function that automatically captures everything
 * No type parameters needed - TypeScript will infer them
 */
export function simpleMonitor<T extends (...args: any[]) => any>(
  fn: T,
  options?: {
    userId?: string | ((args: Parameters<T>) => string),
    chatId?: string | ((args: Parameters<T>) => string),
    task?: string,
    subTask?: string,
  }
): T {
  const monitorOptions = {
    capture: ({ args, result }: { args: Parameters<T>; result: ReturnType<T> }) => ({
      input: args.length === 1 ? args[0] : args,
      output: result,
    }),
    ...options,
  };

  return advancedMonitor(monitorOptions)(fn as any) as T;
}

/**
 * Monitor function with minimal setup
 */
export function quickMonitor<T extends (...args: any[]) => any>(
  fn: T
): T {
  return simpleMonitor(fn);
}