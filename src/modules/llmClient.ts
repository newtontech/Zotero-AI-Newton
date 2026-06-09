import { getString } from "../utils/locale";
import { resolveProviderFromPrefs } from "./aiConfig";
import {
  ChatTurn,
  WorkspaceContext,
  describeItems,
  formatContextForPrompt,
  resolveTone,
} from "./workspaceContext";

export interface GroundedAnswer {
  answer: string;
  citations: Array<{
    evidenceId: string;
    title: string;
    page?: number;
    quote?: string;
  }>;
  unsupportedClaims?: string[];
  confidence: "high" | "medium" | "low";
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
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
  const evidenceInstruction =
    getString("workspace-evidence-instruction" as any) || "";
  const intro = `${systemPrompt}\n${getString("workspace-answer-context")} ${contextText}${evidenceInstruction ? "\n\n" + evidenceInstruction : ""}`;

  const trimmedHistory = history
    .slice(-8)
    .map((turn) => ({ role: turn.role, content: turn.content }) as ChatMessage);

  return [
    { role: "system", content: intro },
    ...trimmedHistory,
    { role: "user", content: question },
  ];
}

async function postJSON(url: string, body: any, key: string) {
  const xhr = await Zotero.HTTP.request("POST", url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
    responseType: "json",
    timeout: 60000,
    successCodes: [200, 201],
  });
  return xhr.response || JSON.parse(xhr.responseText || "{}");
}

export async function requestLLMCompletion(
  question: string,
  context: WorkspaceContext,
  history: ChatTurn[],
): Promise<GroundedAnswer | string> {
  const provider = resolveProviderFromPrefs();
  if (!provider.key) {
    throw new Error(getString("workspace-error-missing-key"));
  }
  const payload = {
    model: provider.model,
    messages: buildMessages(question, context, history),
    temperature: 0.4,
  };

  try {
    const data = await postJSON(
      `${provider.apiBase}/chat/completions`,
      payload,
      provider.key,
    );
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(getString("workspace-error-empty"));
    }

    // Try to parse as structured GroundedAnswer
    const parsed = parseGroundedAnswer(String(content).trim());
    return parsed;
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw new Error(
        `${getString("workspace-error-generic")}: ${err.message}`,
        { cause: err },
      );
    }
    throw err as Error;
  }
}

export function groundedAnswerToText(answer: GroundedAnswer | string): string {
  return typeof answer === "string" ? answer : answer.answer;
}

export function parseGroundedAnswer(content: string): GroundedAnswer | string {
  // Try to extract JSON from the response (might be wrapped in markdown code blocks)
  const jsonMatch = content.match(
    /```(?:json)?\s*(\{[\s\S]*\})\s*```|(\{[\s\S]*\})/,
  );

  if (jsonMatch) {
    try {
      const jsonStr = jsonMatch[1] || jsonMatch[2];
      const parsed = JSON.parse(jsonStr);

      // Validate the structure
      if (parsed && typeof parsed === "object" && "answer" in parsed) {
        return {
          answer: parsed.answer || content,
          citations: Array.isArray(parsed.citations) ? parsed.citations : [],
          unsupportedClaims: Array.isArray(parsed.unsupportedClaims)
            ? parsed.unsupportedClaims
            : undefined,
          confidence: ["high", "medium", "low"].includes(parsed.confidence)
            ? parsed.confidence
            : "medium",
        } as GroundedAnswer;
      }
    } catch (e) {
      // JSON parsing failed, fall through to return plain text
      console.warn(
        "Failed to parse structured response, falling back to plain text:",
        e,
      );
    }
  }

  // Return plain text if structured parsing fails
  return content;
}

export function summarizeContextForHistory(context: WorkspaceContext) {
  return describeItems(context.items, context.attachments);
}
