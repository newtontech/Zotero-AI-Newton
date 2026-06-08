import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";
import {
  EvidenceChunk,
  extractEvidenceForItems,
  formatEvidenceForPrompt,
} from "./pdfTextExtractor";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  contextLabel?: string;
}

export interface WorkspaceContext {
  items: Zotero.Item[];
  label: string;
  attachments: number;
  evidenceChunks?: EvidenceChunk[];
  hasPDFEvidence?: boolean;
  pdfWarnings?: string[];
}

export function resolveTone(): string {
  const tonePref = (getPref("agentTone") as string) || "concise";
  switch (tonePref) {
    case "creative":
      return getString("workspace-tone-creative");
    case "detailed":
      return getString("workspace-tone-detailed");
    default:
      return getString("workspace-tone-concise");
  }
}

export function collectContext(): WorkspaceContext {
  const pane = ztoolkit.getGlobal("ZoteroPane");
  const items: Zotero.Item[] = pane?.getSelectedItems?.() || [];
  const collection = pane?.getSelectedCollection?.();
  const collectionItems = collection?.getChildItems?.();
  const mode = (getPref("conversationMode") as string) || "auto";

  let combined: Zotero.Item[] = [];
  if (mode === "item") {
    combined = items;
  } else if (mode === "collection" && Array.isArray(collectionItems)) {
    combined = collectionItems as Zotero.Item[];
  } else if (items.length) {
    combined = items;
  } else if (Array.isArray(collectionItems)) {
    combined = collectionItems as Zotero.Item[];
  }

  const labelParts: string[] = [];
  if (collection?.name) {
    labelParts.push(`${collection.name}`);
  }
  if (combined.length) {
    labelParts.push(`${combined.length} ${getString("workspace-items")}`);
  }

  const attachments = combined.reduce((acc, item) => {
    if (typeof (item as any).getAttachments === "function") {
      return acc + ((item as any).getAttachments() as number[]).length;
    }
    return acc;
  }, 0);

  return {
    items: combined,
    label: labelParts.join(" · ") || getString("workspace-empty"),
    attachments,
  };
}

export async function enrichContextWithPDFEvidence(
  context: WorkspaceContext,
): Promise<WorkspaceContext> {
  if (!context.items.length) return context;

  const { chunks, hasPDFEvidence, warnings } = await extractEvidenceForItems(
    context.items,
  );

  return {
    ...context,
    evidenceChunks: chunks,
    hasPDFEvidence,
    pdfWarnings: warnings,
  };
}

export function describeItems(items: Zotero.Item[], attachments: number) {
  if (!items.length) return getString("workspace-empty");
  const topItems = items.slice(0, 3).map((item) => {
    const title = item.getField("title") || item.getDisplayTitle?.() || "";
    const creators = (item as any).getCreators?.()?.slice?.(0, 2) || [];
    const names = creators
      .map(
        (creator: any) => creator.name || creator.lastName || creator.firstName,
      )
      .filter(Boolean);
    return `${title}${names.length ? ` — ${names.join(", ")}` : ""}`;
  });
  const more = items.length > 3 ? ` +${items.length - 3}` : "";
  const attachmentText = attachments
    ? ` · ${attachments} ${getString("workspace-pdfs")}`
    : "";
  return `${topItems.join(" | ")}${more}${attachmentText}`;
}

export function formatContextForPrompt(context: WorkspaceContext) {
  const itemLines = context.items.map((item) => {
    const title = item.getField("title") || item.getDisplayTitle?.() || "";
    const year = item.getField("year") || item.getField("date") || "";
    const creators = (item as any)
      .getCreators?.()
      ?.map?.(
        (creator: any) => creator.name || creator.lastName || creator.firstName,
      );
    const creatorLabel = creators?.filter(Boolean).join(", ") || "";
    return [title, creatorLabel, year].filter(Boolean).join(" · ");
  });
  const header = `${getString("workspace-context")} (${context.items.length} ${getString(
    "workspace-items",
  )}${context.attachments ? `, ${context.attachments} ${getString("workspace-pdfs")}` : ""})`;

  const parts = [[header, ...itemLines].filter(Boolean).join("\n")];

  // Include PDF evidence if available
  if (context.evidenceChunks && context.evidenceChunks.length > 0) {
    parts.push(formatEvidenceForPrompt(context.evidenceChunks));
  }

  return parts.join("\n\n");
}
