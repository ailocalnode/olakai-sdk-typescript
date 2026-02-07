import { BaseLLMProvider } from "./base";
import type { LLMMetadata, LLMWrapperConfig } from "../types";
import { olakaiLogger } from "../utils";

/**
 * Google Generative AI provider implementation
 * Wraps Google Generative AI client to auto-capture metadata
 */
export class GoogleProvider extends BaseLLMProvider {
  constructor(config: LLMWrapperConfig) {
    super(config);
  }

  getProviderName(): string {
    return "google";
  }

  /**
   * Wrap Google Generative AI client with automatic tracking
   */
  wrap(client: any): any {
    const self = this;

    // Create a proxy that intercepts the models property
    return new Proxy(client, {
      get(target, prop) {
        const original = target[prop];

        // Wrap the models object to intercept getGenerativeModel
        if (prop === "models" && original) {
          return self.wrapModels(original, client);
        }

        return original;
      },
    });
  }

  /**
   * Wrap the models object to intercept generateContent, generateContentStream, and startChat
   */
  private wrapModels(models: any, client: any): any {
    const self = this;

    return new Proxy(models, {
      get(target, prop) {
        const original = target[prop];

        // Wrap generateContent method
        if (prop === "generateContent" && typeof original === "function") {
          return self.wrapGenerateContent(original.bind(target), client);
        }

        // Wrap generateContentStream method
        if (
          prop === "generateContentStream" &&
          typeof original === "function"
        ) {
          return self.wrapGenerateContentStream(original.bind(target), client);
        }

        // Wrap startChat to return a wrapped chat session
        if (prop === "startChat" && typeof original === "function") {
          return function (this: any, ...args: any[]) {
            const chat = original.apply(target, args);
            return self.wrapChatSession(chat, client);
          };
        }

        return original;
      },
    });
  }

  /**
   * Wrap a ChatSession instance to capture sendMessage calls
   */
  private wrapChatSession(chat: any, client: any, modelName?: string): any {
    const self = this;

    return new Proxy(chat, {
      get(target, prop) {
        const original = target[prop];

        // Wrap sendMessage method
        if (prop === "sendMessage" && typeof original === "function") {
          return self.wrapSendMessage(original.bind(target), client, modelName);
        }

        // Wrap sendMessageStream method
        if (prop === "sendMessageStream" && typeof original === "function") {
          return self.wrapSendMessageStream(
            original.bind(target),
            client,
            modelName,
          );
        }

        return original;
      },
    });
  }

  /**
   * Wrap the generateContent method to capture metadata
   */
  private wrapGenerateContent(originalMethod: Function, client: any): Function {
    const self = this;

    return async function (this: any, ...args: any[]) {
      const startTime = Date.now();
      const request = args[0] || {};

      olakaiLogger(`[Google Wrapper] Intercepted generateContent call`, "info");

      // Extract request metadata
      const requestMetadata = self.extractRequestMetadata(request);

      // Extract API key from client
      const apiKey = self.extractApiKey(client);

      try {
        // Call original method
        const response = await originalMethod.apply(this, args);

        const endTime = Date.now();

        // Extract response metadata
        const responseMetadata = self.extractResponseMetadata(response);

        // Combine metadata
        const metadata: LLMMetadata = {
          provider: "google",
          model: request.model || "unknown",
          apiKey,
          ...requestMetadata,
          ...responseMetadata,
          timing: {
            startTime,
            endTime,
            duration: endTime - startTime,
          },
        };

        olakaiLogger(
          `[Google Wrapper] Captured metadata: ${JSON.stringify(metadata)}`,
          "info",
        );

        // Send to Olakai monitoring
        if (typeof (self as any).onLLMCall === "function") {
          (self as any).onLLMCall(request, response, metadata);
        }

        return response;
      } catch (error) {
        const endTime = Date.now();

        // Capture error metadata
        const errorMetadata: LLMMetadata = {
          provider: "google",
          model: request.model || "unknown",
          apiKey,
          ...requestMetadata,
          timing: {
            startTime,
            endTime,
            duration: endTime - startTime,
          },
        };

        olakaiLogger(`[Google Wrapper] Error during call: ${error}`, "error");

        // Send error to monitoring
        if (typeof (self as any).onLLMError === "function") {
          (self as any).onLLMError(request, error, errorMetadata);
        }

        throw error;
      }
    };
  }

  /**
   * Wrap the generateContentStream method to capture metadata
   */
  private wrapGenerateContentStream(
    originalMethod: Function,
    client: any,
  ): Function {
    const self = this;

    return async function (this: any, ...args: any[]) {
      const startTime = Date.now();
      const request = args[0] || {};

      olakaiLogger(
        `[Google Wrapper] Intercepted generateContentStream call`,
        "info",
      );

      // Extract request metadata
      const requestMetadata = self.extractRequestMetadata(request);
      requestMetadata.streamMode = true;

      // Extract API key from client
      const apiKey = self.extractApiKey(client);

      try {
        // Call original method
        const response = await originalMethod.apply(this, args);

        const endTime = Date.now();

        // For streaming, we can't easily extract response metadata
        // without consuming the stream, so we capture what we can
        const metadata: LLMMetadata = {
          provider: "google",
          model: request.model || "unknown",
          apiKey,
          ...requestMetadata,
          streamMode: true,
          timing: {
            startTime,
            endTime,
            duration: endTime - startTime,
          },
        };

        olakaiLogger(
          `[Google Wrapper] Captured stream metadata: ${JSON.stringify(
            metadata,
          )}`,
          "info",
        );

        // Send to Olakai monitoring
        if (typeof (self as any).onLLMCall === "function") {
          (self as any).onLLMCall(request, response, metadata);
        }

        return response;
      } catch (error) {
        const endTime = Date.now();

        const errorMetadata: LLMMetadata = {
          provider: "google",
          model: request.model || "unknown",
          apiKey,
          ...requestMetadata,
          streamMode: true,
          timing: {
            startTime,
            endTime,
            duration: endTime - startTime,
          },
        };

        olakaiLogger(`[Google Wrapper] Stream error: ${error}`, "error");

        if (typeof (self as any).onLLMError === "function") {
          (self as any).onLLMError(request, error, errorMetadata);
        }

        throw error;
      }
    };
  }

  /**
   * Wrap the sendMessage method to capture metadata
   */
  private wrapSendMessage(
    originalMethod: Function,
    client: any,
    modelName?: string,
  ): Function {
    const self = this;

    return async function (this: any, ...args: any[]) {
      const startTime = Date.now();
      const message = args[0];

      olakaiLogger(
        `[Google Wrapper] Intercepted chat.sendMessage call`,
        "info",
      );

      // Extract API key from client
      const apiKey = self.extractApiKey(client);

      try {
        // Call original method
        const response = await originalMethod.apply(this, args);

        const endTime = Date.now();

        // Extract response metadata
        const responseMetadata = self.extractResponseMetadata(response);

        // Combine metadata
        const metadata: LLMMetadata = {
          provider: "google",
          model: modelName || "unknown",
          apiKey,
          ...responseMetadata,
          timing: {
            startTime,
            endTime,
            duration: endTime - startTime,
          },
        };

        olakaiLogger(
          `[Google Wrapper] Captured chat metadata: ${JSON.stringify(
            metadata,
          )}`,
          "info",
        );

        // Send to Olakai monitoring
        if (typeof (self as any).onLLMCall === "function") {
          (self as any).onLLMCall({ message }, response, metadata);
        }

        return response;
      } catch (error) {
        const endTime = Date.now();

        const errorMetadata: LLMMetadata = {
          provider: "google",
          model: modelName || "unknown",
          apiKey,
          timing: {
            startTime,
            endTime,
            duration: endTime - startTime,
          },
        };

        olakaiLogger(`[Google Wrapper] Chat error: ${error}`, "error");

        if (typeof (self as any).onLLMError === "function") {
          (self as any).onLLMError({ message }, error, errorMetadata);
        }

        throw error;
      }
    };
  }

  /**
   * Wrap the sendMessageStream method to capture metadata
   */
  private wrapSendMessageStream(
    originalMethod: Function,
    client: any,
    modelName?: string,
  ): Function {
    const self = this;

    return async function (this: any, ...args: any[]) {
      const startTime = Date.now();
      const message = args[0];

      olakaiLogger(
        `[Google Wrapper] Intercepted chat.sendMessageStream call`,
        "info",
      );

      // Extract API key from client
      const apiKey = self.extractApiKey(client);

      try {
        // Call original method
        const response = await originalMethod.apply(this, args);

        const endTime = Date.now();

        const metadata: LLMMetadata = {
          provider: "google",
          model: modelName || "unknown",
          apiKey,
          streamMode: true,
          timing: {
            startTime,
            endTime,
            duration: endTime - startTime,
          },
        };

        olakaiLogger(
          `[Google Wrapper] Captured chat stream metadata: ${JSON.stringify(
            metadata,
          )}`,
          "info",
        );

        if (typeof (self as any).onLLMCall === "function") {
          (self as any).onLLMCall({ message }, response, metadata);
        }

        return response;
      } catch (error) {
        const endTime = Date.now();

        const errorMetadata: LLMMetadata = {
          provider: "google",
          model: modelName || "unknown",
          apiKey,
          streamMode: true,
          timing: {
            startTime,
            endTime,
            duration: endTime - startTime,
          },
        };

        olakaiLogger(`[Google Wrapper] Chat stream error: ${error}`, "error");

        if (typeof (self as any).onLLMError === "function") {
          (self as any).onLLMError({ message }, error, errorMetadata);
        }

        throw error;
      }
    };
  }

  /**
   * Extract metadata from Google Generative AI request
   */
  protected extractRequestMetadata(request: any): Partial<LLMMetadata> {
    const parameters: Record<string, any> = {};

    // Google uses generationConfig for parameters
    const config = request.generationConfig || {};

    if (config.temperature !== undefined) {
      parameters.temperature = config.temperature;
    }
    if (config.maxOutputTokens !== undefined) {
      parameters.max_tokens = config.maxOutputTokens;
    }
    if (config.topP !== undefined) {
      parameters.top_p = config.topP;
    }
    if (config.topK !== undefined) {
      parameters.top_k = config.topK;
    }
    if (config.candidateCount !== undefined) {
      parameters.n = config.candidateCount;
    }
    if (config.stopSequences !== undefined) {
      parameters.stop = config.stopSequences;
    }

    // Check for function calling (tools)
    const functionCalls = request.tools ? { tools: request.tools } : undefined;

    return {
      parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
      functionCalls: functionCalls ? [functionCalls] : undefined,
    };
  }

  /**
   * Extract metadata from Google Generative AI response
   */
  protected extractResponseMetadata(response: any): Partial<LLMMetadata> {
    const metadata: Partial<LLMMetadata> = {};

    // Extract token usage from usageMetadata
    const usage = response?.response?.usageMetadata || response?.usageMetadata;
    if (usage) {
      metadata.tokens = {
        prompt: usage.promptTokenCount,
        completion: usage.candidatesTokenCount,
        total: usage.totalTokenCount,
      };
    }

    // Extract finish reason from candidates
    const candidates =
      response?.response?.candidates || response?.candidates || [];
    if (candidates.length > 0 && candidates[0].finishReason) {
      metadata.finishReason = candidates[0].finishReason;
    }

    return metadata;
  }

  /**
   * Extract API key from Google Generative AI client
   */
  protected extractApiKey(client: any): string | undefined {
    try {
      // GoogleGenerativeAI stores API key in various ways
      if (client.apiKey) {
        return client.apiKey;
      }
      if (client._apiKey) {
        return client._apiKey;
      }
      // Check internal options
      if (client._options?.apiKey) {
        return client._options.apiKey;
      }

      olakaiLogger(
        "[Google Wrapper] Could not extract API key from client",
        "warn",
      );
      return undefined;
    } catch (error) {
      olakaiLogger(
        `[Google Wrapper] Error extracting API key: ${error}`,
        "error",
      );
      return undefined;
    }
  }
}
