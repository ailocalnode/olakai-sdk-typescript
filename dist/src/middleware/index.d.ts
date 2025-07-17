export * from "./logging";
export * from "./rateLimiter";
export * from "./timeout";
export * from "./caching";
export * from "./circuitBreaker";
export * from "./common";
export * from "./transform";
export * from "./custom";
export type Middleware<TArgs extends any[], TResult> = {
    name: string;
    beforeCall?: (args: TArgs) => TArgs | Promise<TArgs>;
    afterCall?: (result: TResult, args: TArgs) => TResult | Promise<TResult>;
    onError?: (error: any, args: TArgs) => void | Promise<void>;
};
//# sourceMappingURL=index.d.ts.map