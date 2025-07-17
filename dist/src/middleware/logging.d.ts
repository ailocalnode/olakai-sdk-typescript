import { Middleware } from "./index";
export declare function createLoggingMiddleware<TArgs extends any[], TResult>(options: {
    level?: "debug" | "info" | "warn" | "error";
    includeArgs?: boolean;
    includeResult?: boolean;
    logger?: Console;
}): Middleware<TArgs, TResult>;
//# sourceMappingURL=logging.d.ts.map