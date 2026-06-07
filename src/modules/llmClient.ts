import { getString } from "../utils/locale";
import { resolveProviderFromPrefs } from "./aiConfig";
import {
  ChatTurn,
  WorkspaceContext,
  describeItems,
  formatContextForPrompt,
  resolveTone,
} from "./workspaceContext";

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
  const intro = `${systemPrompt}\n${getString("workspace-answer-context")} ${contextText}`;

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
): Promise<string> {
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
    return String(content).trim();
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw new Error(
        `${getString("workspace-error-generic")}: ${err.message}`,
      );
    }
    throw err as Error;
  }
}

export function summarizeContextForHistory(context: WorkspaceContext) {
  return describeItems(context.items, context.attachments);
}
