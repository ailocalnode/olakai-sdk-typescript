/**
 * Helper functions to make monitoring easier and more intuitive
 */

import { monitor } from "./monitor";
import type { MonitorOptions } from "./types";

/**
 * Capture helpers - common patterns for monitoring data
 */
export const capture = {
  /**
   * Capture everything - both full input and output
   */
  all: <TArgs extends any[], TResult>(options?: { 
    email?: string | ((args: TArgs) => string),
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
    email?: string | ((args: TArgs) => string),
    chatId?: string | ((args: TArgs) => string),
    task?: string,
    subTask?: string,
    shouldScore?: boolean,
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
    email?: string | ((args: TArgs) => string),
    chatId?: string | ((args: TArgs) => string),
    task?: string,
    subTask?: string,
    shouldScore?: boolean,
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
    email?: string | ((args: TArgs) => string),
    chatId?: string | ((args: TArgs) => string),
    task?: string,
    subTask?: string,
    shouldScore?: boolean,
    onMonitoredFunctionError?: boolean,
  }) => ({
    capture: ({ args, result }: { args: TArgs; result: TResult }) => ({
      input: config.input(args),
      output: config.output(result),
    }),
    email: config.email,
    chatId: config.chatId,
    task: config.task,
    subTask: config.subTask,
    onMonitoredFunctionError: config.onMonitoredFunctionError,
  }),
};

/**
 * Simple monitor function that automatically captures everything and sends the data to the Olakai API
 * No type parameters needed - TypeScript will infer them
 * @param fn - The function to monitor
 * @param options - The eventual options for the monitored function
 * @returns The monitored function
 */
export function olakaiMonitor<T extends (...args: any[]) => any>(
  fn: T,
  options?: {
    email?: string | ((args: Parameters<T>) => string),
    chatId?: string | ((args: Parameters<T>) => string),
    task?: string,
    subTask?: string,
    shouldScore?: boolean,
    onMonitoredFunctionError?: boolean,
  }
): T {
  const monitorOptions = {
    capture: ({ args, result }: { args: Parameters<T>; result: ReturnType<T> }) => ({
      input: args.length === 1 ? args[0] : args,
      output: result,
    }),
    ...options,
  };

  return monitor(monitorOptions)(fn as any) as T;
}


export function olakaiAdvancedMonitor<T extends (...args: any[]) => any>(
    fn: T,
    options: MonitorOptions<Parameters<T>, ReturnType<T>>
): T {
    return monitor(options)(fn) as T;
}