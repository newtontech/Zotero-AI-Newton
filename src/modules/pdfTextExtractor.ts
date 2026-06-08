import { getString } from "../utils/locale";

export interface EvidenceChunk {
  itemKey: string;
  title: string;
  creators?: string[];
  year?: string;
  sourceType: "metadata" | "pdf_text" | "annotation" | "note";
  page?: number;
  text: string;
}

export interface PDFTextResult {
  itemKey: string;
  title: string;
  creators?: string[];
  year?: string;
  hasPDF: boolean;
  hasFullText: boolean;
  pages: Array<{
    pageIndex: number;
    pageLabel?: string;
    text: string;
  }>;
  annotations: Array<{
    id: string;
    type: string;
    pageIndex: number;
    text: string;
    comment?: string;
  }>;
}

const MAX_EVIDENCE_CHUNKS = 10;
const MAX_TEXT_LENGTH_PER_CHUNK = 1500;
const MAX_PAGES_TO_EXTRACT = 20;

function getCreators(item: Zotero.Item): string[] {
  try {
    const creators = (item as any).getCreators?.();
    if (!creators) return [];
    return creators
      .slice(0, 3)
      .map((c: any) => c.name || c.lastName || c.firstName || "")
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getYear(item: Zotero.Item): string {
  try {
    return item.getField("year") || item.getField("date") || "";
  } catch {
    return "";
  }
}

async function extractPDFText(item: Zotero.Item): Promise<PDFTextResult> {
  const result: PDFTextResult = {
    itemKey: item.key,
    title: item.getField("title") || item.getDisplayTitle?.() || "",
    creators: getCreators(item),
    year: getYear(item),
    hasPDF: false,
    hasFullText: false,
    pages: [],
    annotations: [],
  };

  try {
    const attachments = item.getAttachments();
    if (!attachments || !attachments.length) {
      return result;
    }

    for (const attachmentID of attachments) {
      const attachment = Zotero.Items.get(attachmentID);
      if (!attachment) continue;

      const attachmentLike = attachment as any;
      const contentType = attachment.attachmentContentType || "";
      const attachmentFileName =
        typeof attachmentLike.attachmentFilename === "function"
          ? attachmentLike.attachmentFilename()
          : attachmentLike.attachmentFilename;
      const isPDF =
        contentType === "application/pdf" ||
        attachmentFileName?.toLowerCase().endsWith(".pdf");

      if (!isPDF) continue;

      result.hasPDF = true;

      // Try to get full-text content from Zotero's index
      try {
        const fullTextItem = await (Zotero.FullText as any).getItemText?.(
          attachment.id,
        );
        if (fullTextItem && fullTextItem.text) {
          result.hasFullText = true;
          // Parse full text into pages (best effort)
          const pages = parseFullTextToPages(fullTextItem.text);
          result.pages = pages.slice(0, MAX_PAGES_TO_EXTRACT);
        }
      } catch (e) {
        // Full-text not available
      }

      // Try to get annotations from the PDF
      try {
        const annotations = await getPDFAnnotations(attachment);
        result.annotations = annotations;
      } catch (e) {
        // Annotations not available
      }

      // If we found a PDF with content, we can stop
      if (result.hasFullText || result.annotations.length > 0) {
        break;
      }
    }
  } catch (err) {
    console.error("Error extracting PDF text:", err);
  }

  return result;
}

function parseFullTextToPages(fullText: string): Array<{
  pageIndex: number;
  pageLabel?: string;
  text: string;
}> {
  // Simple page splitting heuristic - look for page markers or split by size
  const pages: Array<{ pageIndex: number; pageLabel?: string; text: string }> =
    [];

  // Try to split by common page markers
  const pageMarkers = fullText.split(/(?=--- Page \d+ ---|=== Page \d+ ===)/gi);

  if (pageMarkers.length > 1) {
    pageMarkers.forEach((marker, idx) => {
      if (idx === 0 && marker.trim().length < 50) return;
      const text = marker
        .replace(/--- Page \d+ ---|=== Page \d+ ===/g, "")
        .trim();
      if (text) {
        pages.push({
          pageIndex: idx,
          text: text.slice(0, MAX_TEXT_LENGTH_PER_CHUNK),
        });
      }
    });
  } else {
    // No page markers found, split by character count (approximate pages)
    const charsPerPage = 3000;
    for (let i = 0; i < fullText.length; i += charsPerPage) {
      pages.push({
        pageIndex: pages.length,
        text: fullText.slice(i, i + charsPerPage).trim(),
      });
    }
  }

  return pages;
}

async function getPDFAnnotations(attachment: Zotero.Item): Promise<
  Array<{
    id: string;
    type: string;
    pageIndex: number;
    text: string;
    comment?: string;
  }>
> {
  const annotations: Array<{
    id: string;
    type: string;
    pageIndex: number;
    text: string;
    comment?: string;
  }> = [];

  try {
    // Get child items (annotations) of the attachment
    const childIDs = (attachment as any).getChildren?.() ?? [];
    for (const childID of childIDs) {
      const child = Zotero.Items.get(childID);
      if (!child) continue;

      const itemType =
        typeof (child as any).getItemType === "function"
          ? (child as any).getItemType()
          : child.itemType;
      if (itemType !== "annotation") continue;

      const annotationType = (child as any).annotationType || "highlight";
      const annotationText = (child as any).annotationText || "";
      const annotationComment = (child as any).annotationComment || "";
      const pageIndex = (child as any).annotationPageLabel
        ? parseInt((child as any).annotationPageLabel, 10) - 1
        : 0;

      if (annotationText || annotationComment) {
        annotations.push({
          id: child.key,
          type: annotationType,
          pageIndex,
          text: annotationText,
          comment: annotationComment || undefined,
        });
      }
    }
  } catch (err) {
    console.error("Error getting PDF annotations:", err);
  }

  return annotations;
}

export async function extractEvidenceForItems(items: Zotero.Item[]): Promise<{
  chunks: EvidenceChunk[];
  hasPDFEvidence: boolean;
  warnings: string[];
}> {
  const chunks: EvidenceChunk[] = [];
  const warnings: string[] = [];
  let hasPDFEvidence = false;

  for (const item of items) {
    const pdfResult = await extractPDFText(item);

    // Add metadata chunk
    const metadataText = buildMetadataText(item);
    chunks.push({
      itemKey: item.key,
      title: pdfResult.title,
      creators: pdfResult.creators,
      year: pdfResult.year,
      sourceType: "metadata",
      text: metadataText,
    });

    if (!pdfResult.hasPDF) {
      warnings.push(
        getString("pdf-no-pdf").replace("{title}", pdfResult.title),
      );
      continue;
    }

    if (!pdfResult.hasFullText && pdfResult.annotations.length === 0) {
      warnings.push(
        getString("pdf-no-fulltext").replace("{title}", pdfResult.title),
      );
      continue;
    }

    hasPDFEvidence = true;

    // Add PDF text chunks (limit to avoid token overflow)
    for (const page of pdfResult.pages.slice(0, 5)) {
      chunks.push({
        itemKey: item.key,
        title: pdfResult.title,
        creators: pdfResult.creators,
        year: pdfResult.year,
        sourceType: "pdf_text",
        page: page.pageIndex + 1,
        text: page.text,
      });
    }

    // Add annotation chunks
    for (const annotation of pdfResult.annotations.slice(0, 5)) {
      const text = annotation.comment
        ? `${annotation.text}\n\nNote: ${annotation.comment}`
        : annotation.text;
      chunks.push({
        itemKey: item.key,
        title: pdfResult.title,
        creators: pdfResult.creators,
        year: pdfResult.year,
        sourceType: "annotation",
        page: annotation.pageIndex + 1,
        text,
      });
    }
  }

  // Limit total chunks
  const limitedChunks = chunks.slice(0, MAX_EVIDENCE_CHUNKS);

  return { chunks: limitedChunks, hasPDFEvidence, warnings };
}

function buildMetadataText(item: Zotero.Item): string {
  const title = item.getField("title") || item.getDisplayTitle?.() || "";
  const creators = getCreators(item);
  const year = getYear(item);
  const abstract = item.getField("abstractNote") || "";
  const tags = item.getTags?.().map((t: any) => t.tag) || [];

  const parts = [
    `Title: ${title}`,
    creators.length ? `Authors: ${creators.join(", ")}` : "",
    year ? `Year: ${year}` : "",
    abstract ? `Abstract: ${abstract}` : "",
    tags.length ? `Tags: ${tags.join(", ")}` : "",
  ];

  return parts.filter(Boolean).join("\n");
}

export function formatEvidenceForPrompt(chunks: EvidenceChunk[]): string {
  if (!chunks.length) return "";

  const lines: string[] = ["=== Evidence ==="];

  for (const chunk of chunks) {
    const sourceLabel =
      chunk.sourceType === "pdf_text"
        ? `PDF Page ${chunk.page}`
        : chunk.sourceType === "annotation"
          ? `Annotation (Page ${chunk.page})`
          : chunk.sourceType === "note"
            ? "Note"
            : "Metadata";

    const header = `[${sourceLabel}] ${chunk.title}`;
    lines.push("", header, chunk.text);
  }

  lines.push("", "=== End of Evidence ===");
  return lines.join("\n");
}

export function buildPDFStatusMessage(
  hasPDFEvidence: boolean,
  warnings: string[],
): string {
  const lines: string[] = [];

  if (hasPDFEvidence) {
    lines.push(getString("pdf-evidence-available"));
  } else if (warnings.length > 0) {
    lines.push(getString("pdf-no-evidence"));
    warnings.forEach((w) => lines.push(`• ${w}`));
  }

  return lines.join("\n");
}
