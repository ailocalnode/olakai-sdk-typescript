/**
 * Helper functions to make monitoring easier and more intuitive
 */
import type { MonitorOptions } from "./types";
/**
 * Capture helpers - common patterns for monitoring data
 */
export declare const capture: {
    /**
     * Capture everything - both full input and output
     */
    all: <TArgs extends any[], TResult>(options?: {
        userId?: string | ((args: TArgs) => string);
        chatId?: string | ((args: TArgs) => string);
        task?: string;
        subTask?: string;
    }) => {
        userId?: string | ((args: TArgs) => string);
        chatId?: string | ((args: TArgs) => string);
        task?: string;
        subTask?: string;
        capture: ({ args, result }: {
            args: TArgs;
            result: TResult;
        }) => {
            input: any;
            output: TResult;
        };
    };
    /**
     * Capture only the input/arguments
     */
    input: <TArgs extends any[], TResult>(options?: {
        userId?: string | ((args: TArgs) => string);
        chatId?: string | ((args: TArgs) => string);
        task?: string;
        subTask?: string;
        shouldScore?: boolean;
    }) => {
        userId?: string | ((args: TArgs) => string);
        chatId?: string | ((args: TArgs) => string);
        task?: string;
        subTask?: string;
        shouldScore?: boolean;
        capture: ({ args }: {
            args: TArgs;
            result: TResult;
        }) => {
            input: any;
            output: string;
        };
    };
    /**
     * Capture only the output/result
     */
    output: <TArgs extends any[], TResult>(options?: {
        userId?: string | ((args: TArgs) => string);
        chatId?: string | ((args: TArgs) => string);
        task?: string;
        subTask?: string;
        shouldScore?: boolean;
    }) => {
        userId?: string | ((args: TArgs) => string);
        chatId?: string | ((args: TArgs) => string);
        task?: string;
        subTask?: string;
        shouldScore?: boolean;
        capture: ({ result }: {
            args: TArgs;
            result: TResult;
        }) => {
            input: string;
            output: TResult;
        };
    };
    /**
     * Custom capture with simple input/output functions
     */
    custom: <TArgs extends any[], TResult>(config: {
        input: (args: TArgs) => any;
        output: (result: TResult) => any;
        userId?: string | ((args: TArgs) => string);
        chatId?: string | ((args: TArgs) => string);
        task?: string;
        subTask?: string;
        shouldScore?: boolean;
    }) => {
        capture: ({ args, result }: {
            args: TArgs;
            result: TResult;
        }) => {
            input: any;
            output: any;
        };
        userId: string | ((args: TArgs) => string) | undefined;
        chatId: string | ((args: TArgs) => string) | undefined;
        task: string | undefined;
        subTask: string | undefined;
    };
};
/**
 * Simple monitor function that automatically captures everything
 * No type parameters needed - TypeScript will infer them
 */
export declare function olakaiMonitor<T extends (...args: any[]) => any>(fn: T, options?: {
    userId?: string | ((args: Parameters<T>) => string);
    chatId?: string | ((args: Parameters<T>) => string);
    task?: string;
    subTask?: string;
    shouldScore?: boolean;
}): T;
export declare function olakaiAdvancedMonitor<T extends (...args: any[]) => any>(fn: T, options: MonitorOptions<Parameters<T>, ReturnType<T>>): T;
//# sourceMappingURL=helpers.d.ts.map