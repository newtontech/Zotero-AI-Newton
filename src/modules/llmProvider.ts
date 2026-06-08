/**
 * LLM Provider Abstraction Layer
 *
 * Provides a modern, extensible interface for LLM providers with:
 * - Streaming support (SSE/WebSocket)
 * - Cancellation (AbortController)
 * - Structured output (JSON mode)
 * - Provider-specific error normalization
 * - Retry/backoff for transient failures
 * - Tool-call readiness for agent runtime
 */

import { getString } from "../utils/locale";

// ==================== Core Types ====================

export type ProviderName = "openai" | "deepseek" | "custom";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  structuredOutput?: boolean;
  jsonSchema?: Record<string, unknown>;
  tools?: ToolDefinition[];
  toolChoice?:
    | "auto"
    | "none"
    | { type: "function"; function: { name: string } };
  signal?: AbortSignal;
}

export interface LLMResponse {
  content: string;
  role: "assistant";
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  raw?: unknown;
}

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onContent?: (fullContent: string) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onError?: (error: Error) => void;
  onComplete?: (response: LLMResponse) => void;
}

// ==================== Provider Interface ====================

export interface LLMProvider {
  /** Unique provider identifier */
  id: ProviderName;
  /** Human-readable provider name */
  displayName: string;
  /** Whether this provider supports streaming responses */
  supportsStreaming: boolean;
  /** Whether this provider supports structured JSON output */
  supportsStructuredOutput: boolean;
  /** Whether this provider supports tool/function calling */
  supportsToolCalls: boolean;
  /** API base URL */
  apiBase: string;
  /** API key (if configured) */
  apiKey?: string;
  /** Default model for this provider */
  defaultModel: string;

  /**
   * Execute a complete (non-streaming) request
   */
  complete(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Execute a streaming request with callbacks
   * Only called if supportsStreaming is true
   */
  stream?(request: LLMRequest, callbacks: StreamCallbacks): Promise<void>;

  /**
   * Validate provider configuration
   */
  validate(): { valid: boolean; error?: string };
}

// ==================== Error Types ====================

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider?: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

export class LLMStreamError extends LLMError {
  constructor(message: string, provider?: string, statusCode?: number) {
    super(message, "STREAM_ERROR", provider, statusCode, true);
    this.name = "LLMStreamError";
  }
}

export class LLMAuthError extends LLMError {
  constructor(message: string, provider?: string) {
    super(message, "AUTH_ERROR", provider, 401, false);
    this.name = "LLMAuthError";
  }
}

export class LLMRateLimitError extends LLMError {
  constructor(message: string, provider?: string) {
    super(message, "RATE_LIMIT", provider, 429, true);
    this.name = "LLMRateLimitError";
  }
}

export class LLMTimeoutError extends LLMError {
  constructor(message: string, provider?: string) {
    super(message, "TIMEOUT", provider, undefined, true);
    this.name = "LLMTimeoutError";
  }
}

export class LLMCancelledError extends LLMError {
  constructor(provider?: string) {
    super(
      getString("workspace-error-cancelled") || "Request cancelled",
      "CANCELLED",
      provider,
      undefined,
      false,
    );
    this.name = "LLMCancelledError";
  }
}

// ==================== Retry Logic ====================

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableCodes: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableCodes: [429, 500, 502, 503, 504],
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  signal?: AbortSignal,
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    if (signal?.aborted) {
      throw new LLMCancelledError();
    }

    try {
      return await operation();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry if not retryable or if it's the last attempt
      if (
        attempt === cfg.maxRetries ||
        !(lastError instanceof LLMError) ||
        !lastError.retryable
      ) {
        break;
      }

      // Calculate backoff delay with jitter
      const delay = Math.min(
        cfg.baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        cfg.maxDelayMs,
      );

      await sleep(delay, signal);
    }
  }

  throw lastError;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new LLMCancelledError());
      return;
    }

    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(new LLMCancelledError());
    });
  });
}

// ==================== SSE Stream Parser ====================

export async function* parseSSEResponse(
  response: Response,
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new LLMStreamError("Response body is not readable");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) {
        reader.cancel();
        throw new LLMCancelledError();
      }

      const { done, value } = await (reader as any).read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6);
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ==================== Provider Registry ====================

import { LLMProviderRegistry } from "./llmProviderRegistry";

// Re-export for convenience
export { LLMProviderRegistry };
