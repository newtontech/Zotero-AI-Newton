/**
 * Agent runtime for bounded multi-step tool-augmented reasoning.
 *
 * The runtime loops for at most `maxSteps`, letting the LLM decide
 * which registered tools to call, executing them (with confirmation
 * gating for write tools), and feeding observations back until the
 * model emits a final answer or the step budget is exhausted.
 */

import type { ChatTurn, WorkspaceContext } from "./workspaceContext";
import { requestLLMCompletion } from "./llmClient";
import {
  ToolConfirmation,
  ToolDefinition,
  ToolError,
  ToolRegistry,
  defaultRegistry,
  EvidenceChunk,
} from "./agentTools";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentStep {
  step: number;
  toolName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: ToolError | null;
  reasoning: string;
}

export interface AgentRunResult {
  finalAnswer: string;
  steps: AgentStep[];
  evidence: EvidenceChunk[];
  toolCalls: Array<{ tool: string; input: Record<string, unknown> }>;
}

export interface AgentRunOptions {
  /** Max reasoning steps (default 5) */
  maxSteps?: number;
  /** Registry to use (defaults to `defaultRegistry`) */
  registry?: ToolRegistry;
  /** If true, auto-confirm write tools (DANGER – tests only) */
  autoConfirmWrites?: boolean;
}

// ---------------------------------------------------------------------------
// Prompt helpers
// ---------------------------------------------------------------------------

function buildSystemPrompt(tools: ToolDefinition[]): string {
  const toolLines = tools
    .filter((t) => t.permission === "read" || !t.confirmation.required)
    .map(
      (t) =>
        `- ${t.name}: ${t.description} (${t.permission}, timeout ${t.timeoutMs}ms)`,
    );
  return [
    "You are a research-agent that can call tools to answer questions about a Zotero library.",
    "Available tools:",
    ...toolLines,
    "",
    "When you need to call a tool, respond in JSON:",
    '  {"tool": "tool_name", "input": {"arg1": "value1"}}',
    'To give a final answer, respond with: {"answer": "your answer here"}',
    "Do NOT call write tools unless the user has explicitly confirmed.",
  ].join("\n");
}

function buildUserPrompt(
  question: string,
  context: WorkspaceContext,
  history: ChatTurn[],
): string {
  const historyLines = history
    .slice(-4)
    .map((h) => `${h.role}: ${h.content.slice(0, 200)}`);
  return [
    `Context: ${context.label}`,
    ...historyLines,
    `Question: ${question}`,
  ].join("\n");
}

function parseToolCall(
  text: string,
):
  | { tool: string; input: Record<string, unknown> }
  | { answer: string }
  | null {
  try {
    const json = JSON.parse(text);
    if (json.answer) return { answer: json.answer };
    if (json.tool) return { tool: json.tool, input: json.input ?? {} };
  } catch {
    // not JSON – treat as final answer
  }
  return null;
}

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------

export async function runAgent(
  question: string,
  context: WorkspaceContext,
  history: ChatTurn[] = [],
  options: AgentRunOptions = {},
): Promise<AgentRunResult> {
  const maxSteps = options.maxSteps ?? 5;
  const registry = options.registry ?? defaultRegistry;
  const autoConfirm = options.autoConfirmWrites ?? false;

  const readOnlyTools = registry.listReadTools();
  const sysPrompt = buildSystemPrompt(readOnlyTools);

  const steps: AgentStep[] = [];
  const evidence: EvidenceChunk[] = [];
  const toolCalls: Array<{ tool: string; input: Record<string, unknown> }> = [];

  let currentPrompt = buildUserPrompt(question, context, history);

  for (let step = 1; step <= maxSteps; step++) {
    const llmReply = await requestLLMCompletion(
      `${sysPrompt}\n\n${currentPrompt}`,
      context,
      history,
    );

    const parsed = parseToolCall(llmReply);

    // Final answer
    if (parsed && "answer" in parsed) {
      steps.push({
        step,
        toolName: "(answer)",
        input: {},
        output: null,
        error: null,
        reasoning: llmReply,
      });
      return { finalAnswer: parsed.answer, steps, evidence, toolCalls };
    }

    // Tool call
    if (parsed && "tool" in parsed) {
      const { tool: toolName, input } = parsed;
      toolCalls.push({ tool: toolName, input });

      let output: Record<string, unknown> | null = null;
      let error: ToolError | null = null;

      try {
        const confirmed = autoConfirm; // in real UI, ask the user
        output = (await registry.execute(toolName, input, confirmed)) as Record<
          string,
          unknown
        >;

        // Collect evidence chunks
        if (output && typeof output === "object") {
          const chunks = output as Record<string, unknown>;
          if (Array.isArray(chunks["items"])) {
            for (const item of chunks["items"] as EvidenceChunk[]) {
              evidence.push(item);
            }
          }
          if (Array.isArray(chunks["annotations"])) {
            for (const ann of chunks["annotations"] as EvidenceChunk[]) {
              evidence.push(ann);
            }
          }
        }
      } catch (err: unknown) {
        error = err as ToolError;
      }

      steps.push({ step, toolName, input, output, error, reasoning: llmReply });

      if (error) {
        currentPrompt = `Tool "${toolName}" failed: ${error.message}\nWhat should I do next?`;
      } else {
        currentPrompt = `Tool "${toolName}" returned: ${JSON.stringify(output).slice(0, 500)}\nWhat should I do next?`;
      }
      continue;
    }

    // Unstructured reply – treat as final answer
    return {
      finalAnswer: llmReply,
      steps,
      evidence,
      toolCalls,
    };
  }

  // Max steps exhausted
  return {
    finalAnswer: "The agent ran out of steps before reaching a final answer.",
    steps,
    evidence,
    toolCalls,
  };
}
