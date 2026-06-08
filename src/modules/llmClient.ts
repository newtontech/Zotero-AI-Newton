import { getString } from "../utils/locale";
import { resolveProviderFromPrefs } from "./aiConfig";
import {
  ChatTurn,
  WorkspaceContext,
  describeItems,
  formatContextForPrompt,
  resolveTone,
} from "./workspaceContext";
import { redactApiKey, isAllowedApiUrl, safeLog } from "../utils/security";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Sanitize user input to prevent prompt injection attacks.
 * Escapes delimiter markers and strips potential injection patterns.
 */
function sanitizeUserInput(input: string): string {
  if (!input) return input;

  let sanitized = input;

  // Escape delimiter markers to prevent breaking out of the safe zone
  sanitized = sanitized.replace(
    /### USER CONTENT START ###/gi,
    "[REMOVED DELIMITER]",
  );
  sanitized = sanitized.replace(
    /### USER CONTENT END ###/gi,
    "[REMOVED DELIMITER]",
  );

  // Strip common prompt injection patterns
  // Remove attempts to override system instructions
  sanitized = sanitized.replace(
    /ignore (all )?(previous|above|prior) instructions?/gi,
    "[REMOVED]",
  );
  sanitized = sanitized.replace(
    /you are now|act as|pretend to be/gi,
    "[REMOVED]",
  );

  // Limit input length to prevent abuse (max 50k characters)
  const MAX_INPUT_LENGTH = 50000;
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized =
      sanitized.substring(0, MAX_INPUT_LENGTH) + "\n[CONTENT TRUNCATED]";
  }

  return sanitized;
}

function buildMessages(
  question: string,
  context: WorkspaceContext,
  history: ChatTurn[],
): ChatMessage[] {
  const tone = resolveTone();
  const systemPrompt = getString("workspace-system-prompt", {
    args: {
      tone,
    },
  });
  const contextText = formatContextForPrompt(context);

  // Wrap untrusted content in delimiters to prevent prompt injection
  const safeQuestion = sanitizeUserInput(question);
  const wrappedContext = `### USER CONTENT START ###\n${contextText}\n### USER CONTENT END ###`;
  const wrappedQuestion = `### USER CONTENT START ###\n${safeQuestion}\n### USER CONTENT END ###`;

  const intro = `${systemPrompt}\n${getString("workspace-answer-context")} ${wrappedContext}`;

  const trimmedHistory = history
    .slice(-8)
    .map((turn) => ({ role: turn.role, content: turn.content }) as ChatMessage);

  return [
    { role: "system", content: intro },
    ...trimmedHistory,
    { role: "user", content: wrappedQuestion },
  ];
}

const MAX_REQUEST_SIZE = 100000; // 100KB max request size
const MAX_RESPONSE_SIZE = 1000000; // 1MB max response size

async function postJSON(url: string, body: any, key: string) {
  const bodyString = JSON.stringify(body);

  // Check request size
  if (bodyString.length > MAX_REQUEST_SIZE) {
    throw new Error(
      `Request too large: ${bodyString.length} bytes exceeds limit of ${MAX_REQUEST_SIZE}`,
    );
  }

  safeLog(`POST ${url}`, `Request size: ${bodyString.length} bytes`);

  const xhr = await Zotero.HTTP.request("POST", url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: bodyString,
    responseType: "json",
    timeout: 60000, // 60 second timeout
    successCodes: [200, 201],
  });

  const response = xhr.response || JSON.parse(xhr.responseText || "{}");

  // Check response size (approximate)
  const responseSize = JSON.stringify(response).length;
  if (responseSize > MAX_RESPONSE_SIZE) {
    throw new Error(
      `Response too large: ${responseSize} bytes exceeds limit of ${MAX_RESPONSE_SIZE}`,
    );
  }

  safeLog(`Response received`, `Response size: ${responseSize} bytes`);

  return response;
}

export async function requestLLMCompletion(
  question: string,
  context: WorkspaceContext,
  history: ChatTurn[],
): Promise<string> {
  const provider = resolveProviderFromPrefs();

  // Validate API base URL to prevent SSRF
  if (!isAllowedApiUrl(provider.apiBase)) {
    throw new Error(`Invalid or disallowed API base URL: ${provider.apiBase}`);
  }

  if (!provider.key) {
    throw new Error(getString("workspace-error-missing-key"));
  }

  const payload = {
    model: provider.model,
    messages: buildMessages(question, context, history),
    temperature: 0.4,
    max_tokens: 4096, // Add max token limit
  };

  const apiUrl = `${provider.apiBase}/chat/completions`;
  safeLog(`Making LLM request to ${apiUrl}`);

  try {
    const data = await postJSON(apiUrl, payload, provider.key);
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(getString("workspace-error-empty"));
    }
    return String(content).trim();
  } catch (err: unknown) {
    if (err instanceof Error) {
      // Redact API key from error message before throwing
      const redactedMessage = redactApiKey(err.message, provider.key);
      throw new Error(
        `${getString("workspace-error-generic")}: ${redactedMessage}`,
        { cause: err },
      );
    }
    throw err as Error;
  }
}

export function summarizeContextForHistory(context: WorkspaceContext) {
  return describeItems(context.items, context.attachments);
}
