/**
 * LLM Client Module
 *
 * Provides high-level functions for interacting with LLM providers.
 * Uses the provider abstraction layer for modern features like streaming,
 * cancellation, and structured output.
 */

import { getString } from "../utils/locale";
import { resolveProviderFromPrefs } from "./aiConfig";
import {
  ChatTurn,
  WorkspaceContext,
  describeItems,
  formatContextForPrompt,
  resolveTone,
} from "./workspaceContext";
import { LLMProviderRegistry } from "./llmProviderRegistry";
import { LLMRequest, StreamCallbacks, LLMResponse } from "./llmProvider";

// ==================== Types ====================

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ==================== Request Building ====================

function buildMessages(
  question: string,
  context: WorkspaceContext,
  history: ChatTurn[],
): Array<{ role: string; content: string }> {
  const tone = resolveTone();
  const systemPrompt = getString("workspace-system-prompt", {
    args: {
      tone,
    },
  });
  const contextText = formatContextForPrompt(context);
  const intro = `${systemPrompt}\n${getString("workspace-answer-context")} ${contextText}`;

  const trimmedHistory = history.slice(-8).map(
    (turn) =>
      ({ role: turn.role, content: turn.content }) as {
        role: string;
        content: string;
      },
  );

  return [
    { role: "system", content: intro },
    ...trimmedHistory,
    { role: "user", content: question },
  ];
}

// ==================== Legacy API (Backward Compatible) ====================

/**
 * Legacy function for backward compatibility.
 * Sends a request and returns the full completion text.
 *
 * @deprecated Use requestLLMCompletionWithProvider instead
 */
export async function requestLLMCompletion(
  question: string,
  context: WorkspaceContext,
  history: ChatTurn[],
): Promise<string> {
  const providerChoice = resolveProviderFromPrefs();

  // Configure the provider from prefs
  const providerName = providerChoice.name as "openai" | "deepseek" | "custom";
  const registry = LLMProviderRegistry;
  const provider = registry.get(providerName);

  if (provider) {
    // Update provider config
    provider.apiKey = providerChoice.key;
    provider.apiBase = providerChoice.apiBase;

    const request: LLMRequest = {
      messages: buildMessages(question, context, history).map((msg) => ({
        role: msg.role as any,
        content: msg.content,
      })),
      model: providerChoice.model,
      temperature: 0.4,
    };

    const response = await registry.complete(request, providerName);
    return response.content;
  }

  // Fallback for unsupported providers
  throw new Error(
    getString("workspace-error-provider-not-found") ||
      `Provider ${providerName} not found`,
  );
}

// ==================== Modern API with Provider Abstraction ====================

/**
 * Request LLM completion using the provider abstraction.
 * Supports streaming, cancellation, and structured output.
 */
export async function requestLLMCompletionWithProvider(
  question: string,
  context: WorkspaceContext,
  history: ChatTurn[],
  options: {
    stream?: boolean;
    onToken?: (token: string) => void;
    onContent?: (fullContent: string) => void;
    onError?: (error: Error) => void;
    onComplete?: (response: LLMResponse) => void;
    signal?: AbortSignal;
    structuredOutput?: boolean;
    jsonSchema?: Record<string, unknown>;
    maxTokens?: number;
    temperature?: number;
    providerName?: "openai" | "deepseek" | "custom";
  } = {},
): Promise<string> {
  const providerChoice =
    options.providerName === undefined
      ? resolveProviderFromPrefs()
      : await getProviderChoice(options.providerName);

  const providerName = options.providerName || providerChoice.name;
  const registry = LLMProviderRegistry;

  const messages = buildMessages(question, context, history).map((msg) => ({
    role: msg.role as any,
    content: msg.content,
  }));

  const request: LLMRequest = {
    messages,
    model: providerChoice.model,
    temperature: options.temperature ?? 0.4,
    maxTokens: options.maxTokens,
    stream: options.stream ?? false,
    structuredOutput: options.structuredOutput,
    jsonSchema: options.jsonSchema,
    signal: options.signal,
  };

  if (options.stream && options.onToken) {
    const callbacks: StreamCallbacks = {
      onToken: options.onToken,
      onContent: options.onContent,
      onError: options.onError,
      onComplete: options.onComplete,
    };

    await registry.stream(request, callbacks, providerName as any);
    return ""; // Content is delivered via callbacks
  }

  const response = await registry.complete(request, providerName as any);
  return response.content;
}

/**
 * Request a streaming completion with callbacks.
 */
export async function requestLLMStream(
  question: string,
  context: WorkspaceContext,
  history: ChatTurn[],
  callbacks: StreamCallbacks,
  options: {
    signal?: AbortSignal;
    maxTokens?: number;
    temperature?: number;
    providerName?: "openai" | "deepseek" | "custom";
  } = {},
): Promise<void> {
  const providerChoice =
    options.providerName === undefined
      ? resolveProviderFromPrefs()
      : await getProviderChoice(options.providerName);

  const providerName = options.providerName || providerChoice.name;
  const registry = LLMProviderRegistry;

  const messages = buildMessages(question, context, history).map((msg) => ({
    role: msg.role as any,
    content: msg.content,
  }));

  const request: LLMRequest = {
    messages,
    model: providerChoice.model,
    temperature: options.temperature ?? 0.4,
    maxTokens: options.maxTokens,
    stream: true,
    signal: options.signal,
  };

  await registry.stream(request, callbacks, providerName as any);
}

/**
 * Request structured output (JSON mode).
 */
export async function requestStructuredOutput(
  question: string,
  context: WorkspaceContext,
  history: ChatTurn[],
  jsonSchema: Record<string, unknown>,
  options: {
    signal?: AbortSignal;
    maxTokens?: number;
    temperature?: number;
    providerName?: "openai" | "deepseek" | "custom";
  } = {},
): Promise<Record<string, unknown>> {
  const providerChoice =
    options.providerName === undefined
      ? resolveProviderFromPrefs()
      : await getProviderChoice(options.providerName);

  const providerName = options.providerName || providerChoice.name;
  const registry = LLMProviderRegistry;

  // Check if provider supports structured output
  if (!registry.supportsStructuredOutput(providerName as any)) {
    throw new Error(
      getString("workspace-error-structured-output-not-supported") ||
        `Provider ${providerName} does not support structured output`,
    );
  }

  const messages = buildMessages(question, context, history).map((msg) => ({
    role: msg.role as any,
    content: msg.content,
  }));

  const request: LLMRequest = {
    messages,
    model: providerChoice.model,
    temperature: options.temperature ?? 0.4,
    maxTokens: options.maxTokens,
    structuredOutput: true,
    jsonSchema,
    signal: options.signal,
  };

  const response = await registry.complete(request, providerName as any);

  try {
    return JSON.parse(response.content);
  } catch (err) {
    throw new Error(
      getString("workspace-error-json-parse") ||
        "Failed to parse structured output as JSON",
      { cause: err },
    );
  }
}

// ==================== Helper Functions ====================

async function getProviderChoice(providerName: string): Promise<{
  name: "openai" | "deepseek" | "custom";
  key: string;
  model: string;
  apiBase: string;
}> {
  const { resolveProviderFromPrefs } = await import("./aiConfig");
  return resolveProviderFromPrefs();
}

/**
 * Cancel an in-flight request using AbortController.
 */
export function createCancellableRequest(): {
  signal: AbortSignal;
  cancel: () => void;
} {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    cancel: () => controller.abort(),
  };
}

/**
 * Summarize context for history display.
 */
export function summarizeContextForHistory(context: WorkspaceContext) {
  return describeItems(context.items, context.attachments);
}
