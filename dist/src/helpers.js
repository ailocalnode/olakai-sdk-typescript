"use strict";
/**
 * Helper functions to make monitoring easier and more intuitive
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.capture = void 0;
exports.olakaiMonitor = olakaiMonitor;
exports.olakaiAdvancedMonitor = olakaiAdvancedMonitor;
const monitor_1 = require("./monitor");
/**
 * Capture helpers - common patterns for monitoring data
 */
exports.capture = {
    /**
     * Capture everything - both full input and output
     */
    all: (options) => ({
        capture: ({ args, result }) => ({
            input: args.length === 1 ? args[0] : args,
            output: result,
        }),
        ...options,
    }),
    /**
     * Capture only the input/arguments
     */
    input: (options) => ({
        capture: ({ args }) => ({
            input: args.length === 1 ? args[0] : args,
            output: "Function executed successfully",
        }),
        ...options,
    }),
    /**
     * Capture only the output/result
     */
    output: (options) => ({
        capture: ({ result }) => ({
            input: "Function called",
            output: result,
        }),
        ...options,
    }),
    /**
     * Custom capture with simple input/output functions
     */
    custom: (config) => ({
        capture: ({ args, result }) => ({
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
function olakaiMonitor(fn, options) {
    const monitorOptions = {
        capture: ({ args, result }) => ({
            input: args.length === 1 ? args[0] : args,
            output: result,
        }),
        ...options,
    };
    return (0, monitor_1.monitor)(monitorOptions)(fn);
}
function olakaiAdvancedMonitor(fn, options) {
    return (0, monitor_1.monitor)(options)(fn);
}
//# sourceMappingURL=helpers.js.map