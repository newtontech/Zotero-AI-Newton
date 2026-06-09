import { assert } from "chai";
import {
  EvidenceChunk,
  extractEvidenceForItems,
  formatEvidenceForPrompt,
  buildPDFStatusMessage,
} from "../src/modules/pdfTextExtractor";

// ---------------------------------------------------------------------------
// Mock Zotero global for testing
// ---------------------------------------------------------------------------

const mockItems: Record<number, any> = {};
const mockFullText: Record<number, any> = {};

function createMockItem(overrides: any = {}): any {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  const item = {
    id,
    key: overrides.key || `mock-${id}`,
    getField: (field: string) => overrides.fields?.[field] || "",
    getDisplayTitle: () => overrides.title || "",
    getCreators: () => overrides.creators || [],
    getAttachments: () => overrides.attachments || [],
    getTags: () => overrides.tags || [],
    getItemType: () => overrides.itemType || "journalArticle",
    attachmentContentType: overrides.attachmentContentType || "",
    attachmentFilename: () => overrides.filename || "",
    getChildren: () => overrides.children || [],
    ...overrides,
  };
  mockItems[id] = item;
  return item;
}

// Setup global Zotero mock
beforeEach(function () {
  (global as any).Zotero = {
    Items: {
      get: (id: number) => mockItems[id] || null,
    },
    FullText: {
      getItemText: async (id: number) => mockFullText[id] || null,
    },
    HTTP: {
      request: async () => ({}),
    },
  };
});

afterEach(function () {
  Object.keys(mockItems).forEach((k) => delete mockItems[parseInt(k)]);
  Object.keys(mockFullText).forEach((k) => delete mockFullText[parseInt(k)]);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("pdfTextExtractor", function () {
  describe("extractEvidenceForItems", function () {
    it("returns metadata chunk when item has no attachments", async function () {
      const item = createMockItem({
        title: "Test Paper",
        creators: [{ lastName: "Smith" }],
        fields: { title: "Test Paper", year: "2024" },
        attachments: [],
      });

      const { chunks, hasPDFEvidence, warnings } =
        await extractEvidenceForItems([item]);

      assert.strictEqual(chunks.length, 1);
      assert.strictEqual(chunks[0].sourceType, "metadata");
      assert.strictEqual(chunks[0].title, "Test Paper");
      assert.isFalse(hasPDFEvidence);
      assert.isAtLeast(warnings.length, 1);
    });

    it("detects PDF attachment but no full-text", async function () {
      const pdfAttachment = createMockItem({
        id: 999,
        itemType: "attachment",
        attachmentContentType: "application/pdf",
        filename: () => "paper.pdf",
        children: [],
      });

      const item = createMockItem({
        title: "PDF Paper",
        fields: { title: "PDF Paper" },
        attachments: [999],
      });

      // No full-text indexed
      mockFullText[999] = null;

      const { chunks, hasPDFEvidence, warnings } =
        await extractEvidenceForItems([item]);

      // Should have metadata chunk + warning
      assert.isAtLeast(chunks.length, 1);
      assert.isFalse(hasPDFEvidence);
      assert.isAtLeast(warnings.length, 1);
    });

    it("extracts PDF text when full-text is available", async function () {
      const pdfAttachment = createMockItem({
        id: 888,
        itemType: "attachment",
        attachmentContentType: "application/pdf",
        filename: () => "paper.pdf",
        children: [],
      });

      const item = createMockItem({
        title: "Full Text Paper",
        fields: { title: "Full Text Paper" },
        attachments: [888],
      });

      // Mock full-text
      mockFullText[888] = {
        text: "Page 1 content here. ".repeat(100),
      };

      const { chunks, hasPDFEvidence } = await extractEvidenceForItems([item]);

      // Should have metadata + pdf_text chunks
      const pdfChunks = chunks.filter((c) => c.sourceType === "pdf_text");
      assert.isAbove(pdfChunks.length, 0);
      assert.isTrue(hasPDFEvidence);
    });

    it("extracts annotations from PDF", async function () {
      const annotationItem = createMockItem({
        id: 777,
        itemType: "annotation",
        annotationType: "highlight",
        annotationText: "This is an important finding",
        annotationComment: "Note: check methodology",
        annotationPageLabel: "3",
        key: "annot-1",
      });

      const pdfAttachment = createMockItem({
        id: 666,
        itemType: "attachment",
        attachmentContentType: "application/pdf",
        filename: () => "paper.pdf",
        children: [777],
      });

      const item = createMockItem({
        title: "Annotated Paper",
        fields: { title: "Annotated Paper" },
        attachments: [666],
      });

      mockFullText[666] = null;

      const { chunks, hasPDFEvidence } = await extractEvidenceForItems([item]);

      const annotChunks = chunks.filter((c) => c.sourceType === "annotation");
      if (annotChunks.length > 0) {
        assert.strictEqual(annotChunks[0].page, 3);
        assert.include(annotChunks[0].text, "important finding");
      }
    });

    it("limits total chunks to MAX_EVIDENCE_CHUNKS", async function () {
      const item = createMockItem({
        title: "Multi-page Paper",
        fields: { title: "Multi-page Paper" },
        attachments: [111],
      });

      // Create a large full-text that would generate many pages
      mockFullText[111] = {
        text: Array(50).fill("Page content. ".repeat(200)).join("\n\n"),
      };

      const { chunks } = await extractEvidenceForItems([item]);

      assert.isAtMost(chunks.length, 15); // metadata + max chunks
    });
  });

  describe("formatEvidenceForPrompt", function () {
    it("returns empty string for empty chunks", function () {
      const result = formatEvidenceForPrompt([]);
      assert.strictEqual(result, "");
    });

    it("formats evidence chunks with source labels", function () {
      const chunks: EvidenceChunk[] = [
        {
          itemKey: "item-1",
          title: "Test Paper",
          sourceType: "pdf_text",
          page: 1,
          text: "First page content",
        },
        {
          itemKey: "item-1",
          title: "Test Paper",
          sourceType: "annotation",
          page: 3,
          text: "Annotated text",
        },
      ];

      const result = formatEvidenceForPrompt(chunks);

      assert.include(result, "=== Evidence ===");
      assert.include(result, "[PDF Page 1]");
      assert.include(result, "[Annotation (Page 3)]");
      assert.include(result, "First page content");
      assert.include(result, "=== End of Evidence ===");
    });

    it("handles metadata chunks", function () {
      const chunks: EvidenceChunk[] = [
        {
          itemKey: "item-1",
          title: "Test Paper",
          sourceType: "metadata",
          text: "Title: Test Paper\nAuthors: Smith",
        },
      ];

      const result = formatEvidenceForPrompt(chunks);

      assert.include(result, "[Metadata]");
      assert.include(result, "Test Paper");
    });
  });

  describe("buildPDFStatusMessage", function () {
    it("indicates PDF evidence available", function () {
      const msg = buildPDFStatusMessage(true, []);
      assert.include(msg, "PDF evidence available");
    });

    it("shows warnings when no evidence available", function () {
      const msg = buildPDFStatusMessage(false, ["No PDF for Test Paper"]);
      assert.include(msg, "No PDF evidence available");
      assert.include(msg, "No PDF for Test Paper");
    });

    it("handles empty warnings", function () {
      const msg = buildPDFStatusMessage(false, []);
      assert.include(msg, "No PDF evidence available");
    });
  });
});
