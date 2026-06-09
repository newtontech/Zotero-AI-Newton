import { getString } from "../utils/locale";
import {
  groundedAnswerToText,
  requestLLMCompletion,
  summarizeContextForHistory,
} from "./llmClient";
import type { ChatTurn, WorkspaceContext } from "./workspaceContext";
import { describeItems, formatContextForPrompt } from "./workspaceContext";

export type AnalysisKind = "summary" | "keywords" | "related";

export interface AnalysisTemplate {
  kind: AnalysisKind;
  label: string;
}

export interface AnalysisResult {
  kind: AnalysisKind;
  prompt: string;
  output: string;
  contextLabel: string;
}

export abstract class BaseAIAnalysis {
  abstract readonly kind: AnalysisKind;

  constructor(
    protected readonly context: WorkspaceContext,
    protected readonly history: ChatTurn[] = [],
  ) {}

  abstract label(): string;

  abstract buildInstruction(): string;

  buildPrompt(): string {
    return [this.buildInstruction(), this.contextHeader(), this.contextBlock()]
      .filter(Boolean)
      .join("\n\n");
  }

  async analyze(): Promise<AnalysisResult> {
    const prompt = this.buildPrompt();
    const output = await requestLLMCompletion(
      prompt,
      this.context,
      this.history,
    );
    return {
      kind: this.kind,
      prompt,
      output: groundedAnswerToText(output),
      contextLabel: summarizeContextForHistory(this.context),
    };
  }

  protected contextHeader(): string {
    return describeItems(this.context.items, this.context.attachments);
  }

  protected contextBlock(): string {
    return formatContextForPrompt(this.context);
  }
}

export class SummaryAnalysis extends BaseAIAnalysis {
  readonly kind = "summary" as const;

  label(): string {
    return getString("workspace-template-summary");
  }

  buildInstruction(): string {
    return getString("analysis-summary-prompt");
  }
}

export class KeywordAnalysis extends BaseAIAnalysis {
  readonly kind = "keywords" as const;

  label(): string {
    return getString("workspace-template-keywords");
  }

  buildInstruction(): string {
    return getString("analysis-keywords-prompt");
  }
}

export class RelatedWorkAnalysis extends BaseAIAnalysis {
  readonly kind = "related" as const;

  label(): string {
    return getString("workspace-template-related");
  }

  buildInstruction(): string {
    return getString("analysis-related-prompt");
  }
}

export function createAIAnalysis(
  kind: AnalysisKind,
  context: WorkspaceContext,
  history: ChatTurn[] = [],
): BaseAIAnalysis {
  switch (kind) {
    case "keywords":
      return new KeywordAnalysis(context, history);
    case "related":
      return new RelatedWorkAnalysis(context, history);
    case "summary":
    default:
      return new SummaryAnalysis(context, history);
  }
}

export function getAnalysisTemplates(
  context: WorkspaceContext,
  history: ChatTurn[] = [],
): AnalysisTemplate[] {
  return (["summary", "keywords", "related"] as AnalysisKind[]).map((kind) => {
    const analysis = createAIAnalysis(kind, context, history);
    return {
      kind,
      label: analysis.label(),
    };
  });
}

export function buildAnalysisPrompt(
  kind: AnalysisKind,
  context: WorkspaceContext,
  history: ChatTurn[] = [],
): string {
  return createAIAnalysis(kind, context, history).buildPrompt();
}

export function buildAnalysisInstruction(
  kind: AnalysisKind,
  context: WorkspaceContext,
  history: ChatTurn[] = [],
): string {
  return createAIAnalysis(kind, context, history).buildInstruction();
}
