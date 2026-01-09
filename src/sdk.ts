import type {
  EnhancedSDKConfig,
  LLMWrapperConfig,
  LLMMetadata,
  MonitorPayload,
  EnhancedMonitorPayload,
  ControlPayload,
  ControlAPIResponse,
  VercelAIContext,
  OlakaiEventParams,
} from "./types";
import { OpenAIProvider } from "./providers/openai";
import { VercelAIIntegration } from "./integrations/vercel-ai";
import { sendToAPI, initClient } from "./client";
import { createId, olakaiLogger, toJsonValue } from "./utils";
import { OlakaiBlockedError } from "./exceptions";
import packageJson from "../package.json";

/**
 * Main Olakai SDK class
 * Provides simplified API for wrapping LLM clients with automatic tracking
 */
export class OlakaiSDK {
  private config: EnhancedSDKConfig;
  private initialized: boolean = false;
  private vercelAI: VercelAIIntegration;
  private sessionId: string;

  private static readonly DEFAULT_ENDPOINT = "https://app.olakai.ai";

  constructor(config: {
    apiKey: string;
    monitoringEndpoint?: string;
    controlEndpoint?: string;
    enableControl?: boolean;
    retries?: number;
    timeout?: number;
    debug?: boolean;
    verbose?: boolean;
  }) {
    // Build full config with defaults
    const domainUrl = config.monitoringEndpoint
      ? config.monitoringEndpoint.replace("/api/monitoring/prompt", "")
      : OlakaiSDK.DEFAULT_ENDPOINT;

    this.config = {
      apiKey: config.apiKey,
      monitorEndpoint:
        config.monitoringEndpoint || `${domainUrl}/api/monitoring/prompt`,
      controlEndpoint:
        config.controlEndpoint || `${domainUrl}/api/control/prompt`,
      enableControl: config.enableControl ?? false, // Default: disabled
      retries: config.retries ?? 4,
      timeout: config.timeout ?? 30000,
      debug: config.debug ?? false,
      verbose: config.verbose ?? false,
      version: packageJson.version,
    };

    // Initialize Vercel AI integration
    this.vercelAI = new VercelAIIntegration({
      enableControl: this.config.enableControl,
      debug: this.config.debug,
    });

    this.sessionId = createId();
  }

  /**
   * Initialize the SDK (must be called before using wrap)
   */
  async init(): Promise<void> {
    const domainUrl = this.config.monitorEndpoint.replace(
      "/api/monitoring/prompt",
      "",
    );

    await initClient(this.config.apiKey, domainUrl, {
      retries: this.config.retries,
      timeout: this.config.timeout,
      debug: this.config.debug,
      verbose: this.config.verbose,
    });

    this.initialized = true;
    olakaiLogger("[Olakai SDK] Initialized successfully", "info");
  }

  /**
   * Wrap an LLM client for automatic tracking
   * @param client - The LLM client to wrap (e.g., OpenAI client)
   * @param config - Configuration for the wrapper
   * @returns Wrapped client with automatic tracking
   */
  wrap<TClient = any>(
    client: TClient,
    config: LLMWrapperConfig,
  ): TClient {
    if (!this.initialized) {
      throw new Error(
        "[Olakai SDK] SDK not initialized. Call init() first.",
      );
    }

    // Select provider based on config
    let provider: OpenAIProvider;

    switch (config.provider) {
      case "openai":
        provider = new OpenAIProvider(config);
        break;
      case "anthropic":
        throw new Error(
          "[Olakai SDK] Anthropic provider not yet implemented",
        );
      case "custom":
        throw new Error(
          "[Olakai SDK] Custom provider requires implementation",
        );
      default:
        throw new Error(
          `[Olakai SDK] Unsupported provider: ${config.provider}`,
        );
    }

    // Inject callbacks for monitoring
    (provider as any).onLLMCall = async (
      request: any,
      response: any,
      metadata: LLMMetadata,
    ) => {
      await this.handleLLMCall(request, response, metadata, config);
    };

    (provider as any).onLLMError = async (
      request: any,
      error: any,
      metadata: LLMMetadata,
    ) => {
      await this.handleLLMError(request, error, metadata, config);
    };

    return provider.wrap(client);
  }

  /**
   * Handle successful LLM call - check control and send monitoring
   */
  private async handleLLMCall(
    request: any,
    response: any,
    metadata: LLMMetadata,
    wrapperConfig: LLMWrapperConfig,
  ): Promise<void> {
    try {
      // Extract prompt and response text
      const prompt = this.extractPrompt(request);
      const responseText = this.extractResponse(response);

      // Check Control API if enabled
      const enableControl = wrapperConfig.enableControl ?? this.config.enableControl;
      if (enableControl) {
        await this.checkControlAPI(prompt, metadata, wrapperConfig);
      }

      // Send to Monitoring API
      await this.sendMonitoring(
        prompt,
        responseText,
        metadata,
        wrapperConfig,
        false, // not blocked
      );
    } catch (error) {
      if (error instanceof OlakaiBlockedError) {
        // Re-throw blocking errors
        throw error;
      }
      // Log other errors but don't break the user's flow
      olakaiLogger(
        `[Olakai SDK] Error in monitoring: ${error}`,
        "error",
      );
    }
  }

  /**
   * Handle LLM error - send error monitoring
   */
  private async handleLLMError(
    request: any,
    error: any,
    metadata: LLMMetadata,
    wrapperConfig: LLMWrapperConfig,
  ): Promise<void> {
    try {
      const prompt = this.extractPrompt(request);
      const errorMessage = error?.message || String(error);

      // Send error to monitoring
      await this.sendMonitoring(
        prompt,
        "",
        metadata,
        wrapperConfig,
        false,
        errorMessage,
      );
    } catch (monitoringError) {
      olakaiLogger(
        `[Olakai SDK] Error in error monitoring: ${monitoringError}`,
        "error",
      );
    }
  }

  /**
   * Check Control API before execution
   */
  private async checkControlAPI(
    prompt: string,
    metadata: LLMMetadata,
    config: LLMWrapperConfig,
  ): Promise<void> {
    const controlPayload: ControlPayload = {
      prompt: toJsonValue(prompt),
      email: config.defaultContext?.userEmail,
      chatId: this.sessionId,
      task: config.defaultContext?.task,
      subTask: config.defaultContext?.subTask,
      tokens: metadata.tokens?.total,
    };

    try {
      const response = (await sendToAPI(
        controlPayload,
        "control",
      )) as unknown as ControlAPIResponse;

      if (!response.allowed) {
        // Send blocked monitoring event
        await this.sendMonitoring(
          prompt,
          "",
          metadata,
          config,
          true, // blocked
        );

        throw new OlakaiBlockedError(
          "LLM call blocked by Olakai Control API",
          {
            detectedSensitivity: response.details.detectedSensitivity,
            isAllowedPersona: response.details.isAllowedPersona,
          },
        );
      }
    } catch (error) {
      if (error instanceof OlakaiBlockedError) {
        throw error;
      }
      // Log control API errors but allow execution to continue
      olakaiLogger(
        `[Olakai SDK] Control API error (allowing execution): ${error}`,
        "warn",
      );
    }
  }

  /**
   * Send monitoring data to Olakai API
   */
  private async sendMonitoring(
    prompt: string,
    response: string,
    metadata: LLMMetadata,
    config: LLMWrapperConfig,
    blocked: boolean = false,
    errorMessage?: string,
  ): Promise<void> {
    const payload: EnhancedMonitorPayload = {
      prompt: toJsonValue(prompt),
      response: toJsonValue(response),
      email: config.defaultContext?.userEmail,
      chatId: this.sessionId,
      task: config.defaultContext?.task,
      subTask: config.defaultContext?.subTask,
      tokens: metadata.tokens?.total,
      requestTime: metadata.timing?.duration,
      blocked,
      errorMessage,
      llmMetadata: metadata,
    };

    try {
      await sendToAPI(payload as MonitorPayload, "monitoring");
      olakaiLogger(
        "[Olakai SDK] Monitoring data sent successfully",
        "info",
      );
    } catch (error) {
      olakaiLogger(
        `[Olakai SDK] Failed to send monitoring data: ${error}`,
        "error",
      );
      // Don't throw - monitoring failures shouldn't break user's code
    }
  }

  /**
   * Extract prompt from request (works for chat and completion endpoints)
   */
  private extractPrompt(request: any): string {
    try {
      // Chat completion format
      if (request.messages && Array.isArray(request.messages)) {
        return request.messages
          .map((msg: any) => {
            const role = msg.role || "user";
            const content = msg.content || "";
            return `${role}: ${content}`;
          })
          .join("\n");
      }

      // Legacy completion format
      if (request.prompt) {
        return String(request.prompt);
      }

      return "Unable to extract prompt";
    } catch (error) {
      olakaiLogger(
        `[Olakai SDK] Error extracting prompt: ${error}`,
        "error",
      );
      return "Error extracting prompt";
    }
  }

  /**
   * Extract response text from OpenAI response
   */
  private extractResponse(response: any): string {
    try {
      // Chat completion format
      if (response.choices && response.choices[0]?.message?.content) {
        return response.choices[0].message.content;
      }

      // Legacy completion format
      if (response.choices && response.choices[0]?.text) {
        return response.choices[0].text;
      }

      return "Unable to extract response";
    } catch (error) {
      olakaiLogger(
        `[Olakai SDK] Error extracting response: ${error}`,
        "error",
      );
      return "Error extracting response";
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): EnhancedSDKConfig {
    return { ...this.config };
  }

  /**
   * Event-based tracking function
   * Fire and forget - does not await the API call
   * @param params - Event parameters
   */
  event(params: OlakaiEventParams): void {
    if (!this.initialized) {
      console.warn("[Olakai SDK] SDK not initialized. Call init() first.");
      return;
    }

    // Fire and forget - don't await
    this.report(params.prompt, params.response, {
      email: params.userEmail,
      task: params.task,
      subTask: params.subTask,
      tokens: params.tokens,
      requestTime: params.requestTime,
      shouldScore: params.shouldScore,
      customData: params.customData,
      sanitize: false, // Don't sanitize for event-based usage
    }).catch((error) => {
      // Silent fail for event-based usage
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[Olakai SDK] Failed to track event:", error);
      }
    });
  }

  /**
   * Report an AI interaction event directly to Olakai
   * @param prompt - The input/prompt sent to the AI
   * @param response - The response received from the AI
   * @param options - Optional parameters for the report
   * @returns Promise that resolves when the report is sent
   */
  private async report(
    prompt: any,
    response: any,
    options?: {
      email?: string;
      task?: string;
      subTask?: string;
      tokens?: number;
      requestTime?: number;
      shouldScore?: boolean;
      sanitize?: boolean;
      priority?: "low" | "normal" | "high";
      customData?: Record<string, string | number | boolean | undefined>;
    },
  ): Promise<void> {
    try {
      const payload = {
        prompt: toJsonValue(prompt, options?.sanitize),
        response: toJsonValue(response, options?.sanitize),
        email: options?.email || "anonymous@olakai.ai",
        chatId: this.sessionId,
        task: options?.task,
        subTask: options?.subTask,
        tokens: options?.tokens || 0,
        requestTime: options?.requestTime || 0,
        blocked: false,
        sensitivity: [],
        shouldScore: options?.shouldScore,
        customData: options?.customData,
      };

      await sendToAPI(payload, "monitoring");
    } catch (error) {
      // Log error but don't throw - reporting should be fail-safe
      console.warn("[Olakai SDK] Failed to report event:", error);
    }
  }

  /**
   * Vercel AI SDK Integration: generateText
   * Wraps Vercel AI SDK's generateText function for automatic tracking
   * Supports 25+ LLM providers (OpenAI, Anthropic, Google, Mistral, etc.)
   *
   * @param params - Vercel AI SDK generateText parameters
   * @param context - Olakai tracking context
   * @returns generateText result with all metadata
   *
   * @example
   * ```typescript
   * import { openai } from '@ai-sdk/openai';
   *
   * const result = await olakai.generateText({
   *   model: openai('gpt-4'),
   *   prompt: 'Hello world'
   * }, {
   *   task: 'Greeting',
   *   apiKey: 'sk-...'
   * });
   * ```
   */
  async generateText(params: any, context?: VercelAIContext): Promise<any> {
    if (!this.initialized) {
      throw new Error(
        "[Olakai SDK] SDK not initialized. Call init() first.",
      );
    }

    return this.vercelAI.generateText(params, context);
  }

  /**
   * Vercel AI SDK Integration: streamText
   * Wraps Vercel AI SDK's streamText function for automatic tracking
   * Supports 25+ LLM providers (OpenAI, Anthropic, Google, Mistral, etc.)
   *
   * @param params - Vercel AI SDK streamText parameters
   * @param context - Olakai tracking context
   * @returns streamText result with streaming support
   *
   * @example
   * ```typescript
   * import { openai } from '@ai-sdk/openai';
   *
   * const result = await olakai.streamText({
   *   model: openai('gpt-4'),
   *   prompt: 'Write a story'
   * }, {
   *   task: 'Creative Writing',
   *   apiKey: 'sk-...'
   * });
   *
   * for await (const chunk of result.textStream) {
   *   console.log(chunk);
   * }
   * ```
   */
  async streamText(params: any, context?: VercelAIContext): Promise<any> {
    if (!this.initialized) {
      throw new Error(
        "[Olakai SDK] SDK not initialized. Call init() first.",
      );
    }

    return this.vercelAI.streamText(params, context);
  }
}
