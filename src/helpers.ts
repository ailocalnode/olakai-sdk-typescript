/**
 * Helper functions to make monitoring easier and more intuitive
 */

import { monitor } from "./monitor";
import type { MonitorOptions } from "./types";

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
    ...options,
  };

  return monitor(monitorOptions)(fn) as any;
}
