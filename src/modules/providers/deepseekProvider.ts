/**
 * DeepSeek Provider Implementation
 *
 * Implements the LLMProvider interface for DeepSeek's API.
 * DeepSeek's API is OpenAI-compatible with some differences.
 */

import {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  StreamCallbacks,
  ChatMessage,
  ProviderName,
  LLMError,
  LLMStreamError,
  LLMAuthError,
  LLMRateLimitError,
  LLMTimeoutError,
  parseSSEResponse,
} from "../llmProvider";
import { getString } from "../../utils/locale";

export class DeepSeekProvider implements LLMProvider {
  id: ProviderName = "deepseek";
  displayName = "DeepSeek";
  supportsStreaming = true;
  supportsStructuredOutput = false; // DeepSeek doesn't support JSON mode yet
  supportsToolCalls = false; // Tool calls not supported in current API
  apiBase: string;
  apiKey?: string;
  defaultModel = "deepseek-chat";

  constructor(config?: { apiBase?: string; apiKey?: string; model?: string }) {
    this.apiBase = config?.apiBase || "https://api.deepseek.com";
    this.apiKey = config?.apiKey;
    if (config?.model) {
      this.defaultModel = config.model;
    }
  }

  validate(): { valid: boolean; error?: string } {
    if (!this.apiKey) {
      return {
        valid: false,
        error:
          getString("workspace-error-missing-key") ||
          "DeepSeek API key is not configured",
      };
    }
    return { valid: true };
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const payload = this.buildPayload(request, false);
    const response = await this.fetchWithTimeout(
      `${this.apiBase}/chat/completions`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: request.signal,
      },
      60000,
    );

    await this.handleErrorResponse(response);

    const data = await response.json();
    return this.parseResponse(data);
  }

  async stream(request: LLMRequest, callbacks: StreamCallbacks): Promise<void> {
    const payload = this.buildPayload(request, true);
    const response = await this.fetchWithTimeout(
      `${this.apiBase}/chat/completions`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: request.signal,
      },
      60000,
    );

    await this.handleErrorResponse(response);

    let fullContent = "";

    try {
      for await (const token of parseSSEResponse(response, request.signal)) {
        fullContent += token;
        callbacks.onToken?.(token);
        callbacks.onContent?.(fullContent);
      }

      callbacks.onComplete?.({
        content: fullContent,
        role: "assistant",
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      callbacks.onError?.(error);
      throw error;
    }
  }

  private buildPayload(
    request: LLMRequest,
    stream: boolean,
  ): Record<string, unknown> {
    const messages: Record<string, unknown>[] = request.messages.map(
      (msg: ChatMessage) => {
        return {
          role: msg.role,
          content: msg.content,
        };
      },
    );

    const payload: Record<string, unknown> = {
      model: request.model || this.defaultModel,
      messages,
      temperature: request.temperature ?? 0.4,
      stream,
    };

    if (request.maxTokens) {
      payload.max_tokens = request.maxTokens;
    }

    // Note: DeepSeek doesn't support response_format or tools yet
    // These are intentionally omitted

    return payload;
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit & { signal?: AbortSignal },
    timeoutMs: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const combinedSignal = options.signal
      ? this.mergeSignals(options.signal, controller.signal)
      : controller.signal;

    try {
      const response = await fetch(url, {
        ...options,
        signal: combinedSignal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === "AbortError") {
        if (options.signal?.aborted) {
          throw new LLMError(
            getString("workspace-error-cancelled") || "Request cancelled",
            "CANCELLED",
            this.id,
            undefined,
            false,
          );
        }
        throw new LLMTimeoutError(
          getString("workspace-error-timeout") || "Request timed out",
          this.id,
        );
      }
      throw err;
    }
  }

  private mergeSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener("abort", () => controller.abort());
    }
    return controller.signal;
  }

  private async handleErrorResponse(response: Response): Promise<void> {
    if (response.ok) return;

    const status = response.status;
    let errorMessage: string;
    try {
      const errorBody = (await response.json()) as any;
      errorMessage =
        errorBody.error?.message || errorBody.message || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }

    switch (status) {
      case 401:
        throw new LLMAuthError(
          `Authentication failed: ${errorMessage}`,
          this.id,
        );
      case 429:
        throw new LLMRateLimitError(`Rate limited: ${errorMessage}`, this.id);
      case 408:
      case 504:
        throw new LLMTimeoutError(
          `Request timed out: ${errorMessage}`,
          this.id,
        );
      default:
        if (status >= 500) {
          throw new LLMError(
            `Server error: ${errorMessage}`,
            "SERVER_ERROR",
            this.id,
            status,
            true,
          );
        }
        throw new LLMError(
          `Request failed: ${errorMessage}`,
          "REQUEST_FAILED",
          this.id,
          status,
          false,
        );
    }
  }

  private parseResponse(data: unknown): LLMResponse {
    const response = data as Record<string, unknown>;
    const choices = response.choices as Array<Record<string, unknown>>;
    const message = choices?.[0]?.message as Record<string, unknown>;

    if (!message?.content) {
      throw new LLMError(
        getString("workspace-error-empty") || "Empty response from LLM",
        "EMPTY_RESPONSE",
        this.id,
      );
    }

    const result: LLMResponse = {
      content: String(message.content),
      role: "assistant",
    };

    if (response.usage) {
      const usage = response.usage as Record<string, number>;
      result.usage = {
        promptTokens: usage.prompt_tokens || usage.promptTokens || 0,
        completionTokens:
          usage.completion_tokens || usage.completionTokens || 0,
        totalTokens: usage.total_tokens || usage.totalTokens || 0,
      };
    }

    result.raw = data;
    return result;
  }
}
