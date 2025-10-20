/**
 * Helper functions to make monitoring easier and more intuitive
 */

import { monitor } from "./monitor";
import type { MonitorOptions, OlakaiEventParams } from "./types";

/**
 * Event-based configuration function
 * @param config - Configuration object
 */
export async function olakaiConfig(config: {
  apiKey: string;
  endpoint: string;
  debug?: boolean;
}): Promise<void> {
  const { initClient } = await import("./client");
  await initClient(config.apiKey, config.endpoint, {
    debug: config.debug || false,
    verbose: config.debug || false,
  });
}

/**
 * Event-based tracking function
 * @param eventType - Always 'event'
 * @param eventName - Always 'ai_activity'
 * @param params - Event parameters
 */
export function olakai(
  eventType: "event",
  eventName: "ai_activity",
  params: OlakaiEventParams,
): void {
  // Fire and forget - don't await
  olakaiReport(params.prompt, params.response, {
    email: params.email,
    chatId: params.chatId,
    task: params.task,
    subTask: params.subTask,
    tokens: params.tokens,
    requestTime: params.requestTime,
    sanitize: false, // Don't sanitize for event-based usage
  }).catch((error) => {
    // Silent fail for event-based usage
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[Olakai SDK] Failed to track event:", error);
    }
  });
}

/**

/**
 * Monitor function that automatically captures everything by default and sends the data to the Olakai API
 * No type parameters needed - TypeScript will infer them
 * @param fn - The function to monitor
 * @param options - The eventual options for the monitored function
 * @returns The monitored function
 */
export function olakaiMonitor<T extends (...args: any[]) => any>(
  fn: T,
  options?: Partial<MonitorOptions<Parameters<T>, ReturnType<T>>>,
): T extends (...args: any[]) => Promise<any>
  ? (...args: Parameters<T>) => Promise<ReturnType<T>>
  : (...args: Parameters<T>) => Promise<ReturnType<T>> {
  const monitorOptions: MonitorOptions<Parameters<T>, ReturnType<T>> = {
    ...options,
  };

  return monitor(monitorOptions)(fn) as any;
}

/**
 * Report an AI interaction event directly to Olakai without wrapping a function
 * @param prompt - The input/prompt sent to the AI
 * @param response - The response received from the AI
 * @param options - Optional parameters for the report
 * @returns Promise that resolves when the report is sent
 */
export async function olakaiReport(
  prompt: any,
  response: any,
  options?: {
    email?: string;
    chatId?: string;
    task?: string;
    subTask?: string;
    tokens?: number;
    requestTime?: number;
    sanitize?: boolean;
    priority?: "low" | "normal" | "high";
  },
): Promise<void> {
  const { sendToAPI, getConfig } = await import("./client");
  const { toJsonValue } = await import("./utils");

  try {
    const config = getConfig();

    const payload = {
      prompt: toJsonValue(prompt, options?.sanitize),
      response: toJsonValue(response, options?.sanitize),
      email: options?.email || "anonymous@olakai.ai",
      chatId: options?.chatId,
      task: options?.task,
      subTask: options?.subTask,
      tokens: options?.tokens || 0,
      requestTime: options?.requestTime || 0,
      blocked: false,
      sensitivity: [],
    };

    await sendToAPI(payload, "monitoring");
  } catch (error) {
    // Log error but don't throw - reporting should be fail-safe
    console.warn("[Olakai SDK] Failed to report event:", error);
  }
}
