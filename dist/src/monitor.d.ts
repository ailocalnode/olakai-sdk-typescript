import type { MonitorOptions } from "./types";
import type { Middleware } from "./middleware";
export declare function addMiddleware<TArgs extends any[], TResult>(middleware: Middleware<TArgs, TResult>): void;
export declare function removeMiddleware(name: string): void;
/**
 * Monitor a function
 * @param options - The options for the monitored function
 * @param fn - The function to monitor
 * @returns The monitored function
 */
export declare function monitor<TArgs extends any[], TResult>(options: MonitorOptions<TArgs, TResult>): (fn: (...args: TArgs) => Promise<TResult>) => (...args: TArgs) => Promise<TResult>;
export declare function monitor<TArgs extends any[], TResult>(fn: (...args: TArgs) => Promise<TResult>, options: MonitorOptions<TArgs, TResult>): (...args: TArgs) => Promise<TResult>;
//# sourceMappingURL=monitor.d.ts.map