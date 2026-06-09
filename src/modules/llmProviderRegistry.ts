/**
 * LLM Provider Registry
 *
 * Manages multiple LLM providers and provides a unified interface
 * for executing requests across different providers.
 */

import { getString } from "../utils/locale";
import {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  StreamCallbacks,
  ProviderName,
  LLMError,
  LLMAuthError,
  LLMRateLimitError,
  LLMTimeoutError,
  withRetry,
} from "./llmProvider";
import { OpenAIProvider } from "./providers/openaiProvider";
import { DeepSeekProvider } from "./providers/deepseekProvider";
import { CustomProvider } from "./providers/customProvider";

// ==================== Registry ====================

export class LLMProviderRegistry {
  private providers: Map<ProviderName, LLMProvider> = new Map();
  private defaultProvider: ProviderName = "openai";

  constructor() {
    // Register built-in providers
    this.register(new OpenAIProvider());
    this.register(new DeepSeekProvider());
    this.register(new CustomProvider());
  }

  /**
   * Register a new provider
   */
  register(provider: LLMProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Get a provider by name
   */
  get(name: ProviderName): LLMProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all registered providers
   */
  getAll(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Set the default provider
   */
  setDefault(name: ProviderName): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} is not registered`);
    }
    this.defaultProvider = name;
  }

  /**
   * Get the default provider
   */
  getDefault(): LLMProvider {
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) {
      throw new Error(`Default provider ${this.defaultProvider} not found`);
    }
    return provider;
  }

  /**
   * Execute a complete request using the specified or default provider
   */
  async complete(
    request: LLMRequest,
    providerName?: ProviderName,
  ): Promise<LLMResponse> {
    const provider = providerName ? this.get(providerName) : this.getDefault();

    if (!provider) {
      throw new LLMError(
        getString("workspace-error-provider-not-found") ||
          `Provider ${providerName} not found`,
        "PROVIDER_NOT_FOUND",
      );
    }

    const validation = provider.validate();
    if (!validation.valid) {
      throw new LLMAuthError(
        validation.error || "Provider configuration invalid",
        provider.id,
      );
    }

    return withRetry(() => provider.complete(request), {}, request.signal);
  }

  /**
   * Execute a streaming request using the specified or default provider
   */
  async stream(
    request: LLMRequest,
    callbacks: StreamCallbacks,
    providerName?: ProviderName,
  ): Promise<void> {
    const provider = providerName ? this.get(providerName) : this.getDefault();

    if (!provider) {
      throw new LLMError(
        getString("workspace-error-provider-not-found") ||
          `Provider ${providerName} not found`,
        "PROVIDER_NOT_FOUND",
      );
    }

    if (!provider.supportsStreaming || !provider.stream) {
      // Fall back to complete and simulate streaming
      const response = await this.complete(request, providerName);
      callbacks.onToken?.(response.content);
      callbacks.onContent?.(response.content);
      callbacks.onComplete?.(response);
      return;
    }

    const validation = provider.validate();
    if (!validation.valid) {
      throw new LLMAuthError(
        validation.error || "Provider configuration invalid",
        provider.id,
      );
    }

    await withRetry(
      () => provider.stream!(request, callbacks),
      {},
      request.signal,
    );
  }

  /**
   * Check if a provider supports streaming
   */
  supportsStreaming(providerName?: ProviderName): boolean {
    const provider = providerName ? this.get(providerName) : this.getDefault();
    return provider?.supportsStreaming ?? false;
  }

  /**
   * Check if a provider supports structured output
   */
  supportsStructuredOutput(providerName?: ProviderName): boolean {
    const provider = providerName ? this.get(providerName) : this.getDefault();
    return provider?.supportsStructuredOutput ?? false;
  }

  /**
   * Check if a provider supports tool calls
   */
  supportsToolCalls(providerName?: ProviderName): boolean {
    const provider = providerName ? this.get(providerName) : this.getDefault();
    return provider?.supportsToolCalls ?? false;
  }
}

// ==================== Singleton Export ====================

export const defaultProviderRegistry = new LLMProviderRegistry();

// ==================== Provider Implementations ====================

// These will be imported from separate files
export { OpenAIProvider } from "./providers/openaiProvider";
export { DeepSeekProvider } from "./providers/deepseekProvider";
export { CustomProvider } from "./providers/customProvider";
