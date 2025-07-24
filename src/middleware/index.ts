import { olakaiLogger } from "../utils";

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


export async function applyMiddleware<TArgs extends any[], TResult>(
    middlewares: Middleware<TArgs, TResult>[],
    args: TArgs,
    action: "beforeCall" | "afterCall" | "error",
    result?: TResult,
    error?: any,
  ): Promise<TArgs | TResult> {
    olakaiLogger("Applying beforeCall middleware...", "info");
    let processedArgs = args;
    let processedResult = result || null;
    try {
    for (const middleware of middlewares) {
      if (action === "beforeCall" && middleware.beforeCall) {
        const middlewareResult = await middleware.beforeCall(processedArgs);
        if (middlewareResult) {
          processedArgs = middlewareResult;
          }
        }else if (action === "afterCall" && middleware.afterCall && processedResult) {
          const middlewareResult = await middleware.afterCall(processedResult, processedArgs);
          if (middlewareResult) {
            processedResult = middlewareResult;
          }
        }else if (action === "error" && middleware.onError && error) {
          await middleware.onError(error, processedArgs);
        }
      }
    } catch (error) {
      olakaiLogger(`Error during beforeCall middleware: ${error}. \n Continuing execution...`, "error");
      throw error;
    }
    olakaiLogger("BeforeCall middleware completed...", "info");
    if (action === "beforeCall") {
      return processedArgs;
    }else if (action === "afterCall" && processedResult) {
      return processedResult;
    }
    throw new Error("Middleware returned null");
  
  }