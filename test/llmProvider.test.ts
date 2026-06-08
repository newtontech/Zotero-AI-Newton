/**
 * Tests for LLM Provider Abstraction
 *
 * Tests cover:
 * - Provider interface compliance
 * - Streaming support
 * - Cancellation
 * - Structured output
 * - Error normalization
 * - Retry/backoff
 */

import { assert } from "chai";
import {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  StreamCallbacks,
  LLMError,
  LLMStreamError,
  LLMAuthError,
  LLMRateLimitError,
  LLMTimeoutError,
  LLMCancelledError,
  withRetry,
  parseSSEResponse,
} from "../src/modules/llmProvider";
import { LLMProviderRegistry } from "../src/modules/llmProviderRegistry";
import { OpenAIProvider } from "../src/modules/providers/openaiProvider";
import { DeepSeekProvider } from "../src/modules/providers/deepseekProvider";
import { CustomProvider } from "../src/modules/providers/customProvider";

// ==================== Mock Fetch ====================

function createMockResponse(
  body: string,
  options: { status?: number; headers?: Record<string, string> } = {},
): Response {
  const { status = 200, headers = {} } = options;
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

function createMockSSEResponse(events: string[]): Response {
  const stream = new ReadableStream({
    async start(controller) {
      for (const event of events) {
        controller.enqueue(new TextEncoder().encode(event + "\n"));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
    },
  });
}

// ==================== All Tests ====================

describe("LLM Provider Abstraction", function () {
  // ==================== OpenAI Provider Tests ====================
  describe("OpenAIProvider", function () {
    let provider: OpenAIProvider;

    beforeEach(function () {
      provider = new OpenAIProvider({
        apiKey: "test-key",
        apiBase: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
      });
    });

    it("should have correct provider properties", function () {
      assert.equal(provider.id, "openai");
      assert.equal(provider.displayName, "OpenAI");
      assert.isTrue(provider.supportsStreaming);
      assert.isTrue(provider.supportsStructuredOutput);
      assert.isTrue(provider.supportsToolCalls);
    });

    it("should validate API key", function () {
      const invalidProvider = new OpenAIProvider();
      const result = invalidProvider.validate();
      assert.isFalse(result.valid);
      assert.isString(result.error);
    });

    it("should pass validation with API key", function () {
      const result = provider.validate();
      assert.isTrue(result.valid);
    });
  });

  // ==================== DeepSeek Provider Tests ====================
  describe("DeepSeekProvider", function () {
    let provider: DeepSeekProvider;

    beforeEach(function () {
      provider = new DeepSeekProvider({
        apiKey: "test-key",
        apiBase: "https://api.deepseek.com",
        model: "deepseek-chat",
      });
    });

    it("should have correct provider properties", function () {
      assert.equal(provider.id, "deepseek");
      assert.equal(provider.displayName, "DeepSeek");
      assert.isTrue(provider.supportsStreaming);
      assert.isFalse(provider.supportsStructuredOutput);
      assert.isFalse(provider.supportsToolCalls);
    });

    it("should validate API key", function () {
      const invalidProvider = new DeepSeekProvider();
      const result = invalidProvider.validate();
      assert.isFalse(result.valid);
    });
  });

  // ==================== Custom Provider Tests ====================
  describe("CustomProvider", function () {
    let provider: CustomProvider;

    beforeEach(function () {
      provider = new CustomProvider({
        apiKey: "test-key",
        apiBase: "http://localhost:11434/v1",
        model: "llama3",
      });
    });

    it("should have correct provider properties", function () {
      assert.equal(provider.id, "custom");
      assert.equal(provider.displayName, "Custom");
      assert.isTrue(provider.supportsStreaming);
      assert.isTrue(provider.supportsStructuredOutput);
      assert.isTrue(provider.supportsToolCalls);
    });

    it("should validate API base URL", function () {
      const invalidProvider = new CustomProvider();
      const result = invalidProvider.validate();
      assert.isFalse(result.valid);
    });

    it("should pass validation with API base", function () {
      const result = provider.validate();
      assert.isTrue(result.valid);
    });
  });

  // ==================== Provider Registry Tests ====================
  describe("LLMProviderRegistry", function () {
    let registry: LLMProviderRegistry;

    beforeEach(function () {
      // Create a new registry for each test
      registry = new LLMProviderRegistry();
    });

    it("should register built-in providers", function () {
      const providers = registry.getAll();
      const ids = providers.map((p) => p.id);
      assert.include(ids, "openai");
      assert.include(ids, "deepseek");
      assert.include(ids, "custom");
    });

    it("should get provider by name", function () {
      const provider = registry.get("openai");
      assert.isDefined(provider);
      assert.equal(provider?.id, "openai");
    });

    it("should return undefined for unknown provider", function () {
      const provider = registry.get("unknown" as any);
      assert.isUndefined(provider);
    });

    it("should check streaming support", function () {
      assert.isTrue(registry.supportsStreaming("openai"));
      assert.isTrue(registry.supportsStreaming("deepseek"));
      assert.isTrue(registry.supportsStreaming("custom"));
    });

    it("should check structured output support", function () {
      assert.isTrue(registry.supportsStructuredOutput("openai"));
      assert.isFalse(registry.supportsStructuredOutput("deepseek"));
      assert.isTrue(registry.supportsStructuredOutput("custom"));
    });

    it("should check tool calls support", function () {
      assert.isTrue(registry.supportsToolCalls("openai"));
      assert.isFalse(registry.supportsToolCalls("deepseek"));
      assert.isTrue(registry.supportsToolCalls("custom"));
    });
  });

  // ==================== Error Classes Tests ====================
  describe("LLM Error Classes", function () {
    it("should create LLMError with correct properties", function () {
      const error = new LLMError(
        "Test error",
        "TEST_CODE",
        "openai",
        400,
        true,
      );
      assert.equal(error.name, "LLMError");
      assert.equal(error.message, "Test error");
      assert.equal(error.code, "TEST_CODE");
      assert.equal(error.provider, "openai");
      assert.isTrue(error.retryable);
    });

    it("should create LLMAuthError", function () {
      const error = new LLMAuthError("Auth failed", "openai");
      assert.equal(error.name, "LLMAuthError");
      assert.equal(error.code, "AUTH_ERROR");
      assert.equal(error.statusCode, 401);
      assert.isFalse(error.retryable);
    });

    it("should create LLMRateLimitError", function () {
      const error = new LLMRateLimitError("Rate limited", "openai");
      assert.equal(error.name, "LLMRateLimitError");
      assert.equal(error.code, "RATE_LIMIT");
      assert.equal(error.statusCode, 429);
      assert.isTrue(error.retryable);
    });

    it("should create LLMTimeoutError", function () {
      const error = new LLMTimeoutError("Timeout", "openai");
      assert.equal(error.name, "LLMTimeoutError");
      assert.equal(error.code, "TIMEOUT");
      assert.isTrue(error.retryable);
    });

    it("should create LLMCancelledError", function () {
      const error = new LLMCancelledError("openai");
      assert.equal(error.name, "LLMCancelledError");
      assert.equal(error.code, "CANCELLED");
      assert.isFalse(error.retryable);
    });
  });

  // ==================== Retry Logic Tests ====================
  describe("withRetry", function () {
    it("should return result on success", async function () {
      const operation = () => Promise.resolve("success");
      const result = await withRetry(operation);
      assert.equal(result, "success");
    });

    it("should retry on retryable errors", async function () {
      let attempts = 0;
      const operation = () => {
        attempts++;
        if (attempts < 3) {
          throw new LLMRateLimitError("Rate limited");
        }
        return Promise.resolve("success");
      };

      const result = await withRetry(operation, { maxRetries: 3 });
      assert.equal(result, "success");
      assert.equal(attempts, 3);
    });

    it("should not retry on non-retryable errors", async function () {
      let attempts = 0;
      const operation = () => {
        attempts++;
        throw new LLMAuthError("Auth failed");
      };

      try {
        await withRetry(operation, { maxRetries: 3 });
      } catch (err) {
        assert.equal(attempts, 1);
        return;
      }
      assert.fail("Should have thrown");
    });

    it("should throw after max retries", async function () {
      let attempts = 0;
      const operation = () => {
        attempts++;
        throw new LLMRateLimitError("Rate limited");
      };

      try {
        await withRetry(operation, { maxRetries: 2 });
      } catch (err) {
        assert.equal(attempts, 3); // initial + 2 retries
        return;
      }
      assert.fail("Should have thrown");
    });
  });

  // ==================== SSE Parser Tests ====================
  describe("parseSSEResponse", function () {
    it("should parse SSE events", async function () {
      const events = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}',
        'data: {"choices":[{"delta":{"content":" World"}}]}',
        "data: [DONE]",
      ];

      const response = createMockSSEResponse(events);
      const tokens: string[] = [];

      for await (const token of parseSSEResponse(response)) {
        tokens.push(token);
      }

      assert.equal(tokens.length, 2);
      assert.equal(tokens[0], "Hello");
      assert.equal(tokens[1], " World");
    });

    it("should skip empty lines and invalid JSON", async function () {
      const events = [
        "",
        "data: invalid json",
        'data: {"choices":[{"delta":{"content":"Test"}}]}',
      ];

      const response = createMockSSEResponse(events);
      const tokens: string[] = [];

      for await (const token of parseSSEResponse(response)) {
        tokens.push(token);
      }

      assert.equal(tokens.length, 1);
      assert.equal(tokens[0], "Test");
    });
  });

  // ==================== Type Tests ====================
  describe("LLM Types", function () {
    it("should create valid LLMRequest", function () {
      const request: LLMRequest = {
        messages: [{ role: "user", content: "Hello" }],
        model: "gpt-4o-mini",
        temperature: 0.4,
        stream: true,
        structuredOutput: true,
      };
      assert.isDefined(request);
    });

    it("should create valid StreamCallbacks", function () {
      const callbacks: StreamCallbacks = {
        onToken: (token: string) => console.log(token),
        onContent: (content: string) => console.log(content),
        onError: (error: Error) => console.error(error),
        onComplete: (response: LLMResponse) => console.log(response),
      };
      assert.isDefined(callbacks);
    });

    it("should create valid LLMResponse", function () {
      const response: LLMResponse = {
        content: "Test response",
        role: "assistant",
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      };
      assert.equal(response.content, "Test response");
      assert.equal(response.role, "assistant");
    });
  });
});
