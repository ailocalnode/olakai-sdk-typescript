/**
 * Helper functions to make monitoring easier and more intuitive
 */

import { monitor } from "./monitor";
import type { MonitorOptions } from "./types";

/**
 * Capture helpers - common patterns for capturing data to be monitored
 */
export const captureHelpers = {
  /**
   * Capture everything - both full input and output
   * Use this on the options parameter of the olakaiMonitor function
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
   * Use this on the options parameter of the olakaiMonitor function
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
   * Use this on the options parameter of the olakaiMonitor function
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
   * Use this on the options parameter of the olakaiMonitor function
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
 * Mnitor function that automatically captures everything by default and sends the data to the Olakai API
 * No type parameters needed - TypeScript will infer them
 * @param fn - The function to monitor
 * @param options - The eventual options for the monitored function
 * @returns The monitored function
 */
export function olakaiSupervisor<T extends (...args: any[]) => any>(
  fn: T,
  options?: Partial<MonitorOptions<Parameters<T>, ReturnType<T>>>
): T extends (...args: any[]) => Promise<any> 
  ? (...args: Parameters<T>) => Promise<ReturnType<T>>
  : (...args: Parameters<T>) => Promise<ReturnType<T>> {
  
  const monitorOptions: MonitorOptions<Parameters<T>, ReturnType<T>> = {
    capture: ({ args, result }: { args: Parameters<T>; result: ReturnType<T> }) => ({
      input: args.length === 1 ? args[0] : args,
      output: result,
    }),
    ...options,
  };

  return monitor(monitorOptions)(fn) as any;
}
