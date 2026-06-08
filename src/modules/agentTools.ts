/**
 * Typed Zotero tool registry for agent workflows.
 *
 * Provides a TypeScript tool registry with typed schemas and permission
 * metadata. Tools declare their name, description, input/output schemas,
 * read/write permission, confirmation requirement, timeout, and error type.
 */

// ---------------------------------------------------------------------------
// EvidenceChunk (from issue #27)
// ---------------------------------------------------------------------------

/**
 * A chunk of evidence returned by a tool, referencing a Zotero item or
 * annotation.  Tool outputs use this model so the agent can cite sources.
 */
export interface EvidenceChunk {
  /** Zotero item key (or empty for non-item evidence) */
  itemKey: string;
  /** Human-readable label for the UI (e.g. paper title) */
  label: string;
  /** Snippet of text serving as evidence */
  snippet: string;
  /** Optional page number (for PDF-derived evidence) */
  page?: number;
  /** Optional annotation key (for annotation-derived evidence) */
  annotationKey?: string;
}

// ---------------------------------------------------------------------------
// Permission model
// ---------------------------------------------------------------------------

export type ToolPermission = "read" | "write";

export interface ToolConfirmation {
  required: boolean;
  reason: string;
}

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export interface ToolInputSchema {
  [key: string]: unknown;
}

export interface ToolOutputSchema {
  [key: string]: unknown;
}

export type ToolErrorType =
  | "not_found"
  | "permission_denied"
  | "timeout"
  | "invalid_input"
  | "execution_failed";

export interface ToolDefinition<
  TInput = ToolInputSchema,
  TOutput = ToolOutputSchema,
> {
  /** Unique tool name (snake_case) */
  name: string;
  /** Human-readable description for the LLM */
  description: string;
  /** Input schema (JSON-Schema-like, kept simple for now) */
  inputSchema: TInput;
  /** Output schema */
  outputSchema: TOutput;
  /** Whether this tool reads or writes */
  permission: ToolPermission;
  /** Confirmation requirement for write tools */
  confirmation: ToolConfirmation;
  /** Timeout in milliseconds */
  timeoutMs: number;
  /** Executor – may reject with a ToolError */
  execute(input: TInput): Promise<TOutput>;
}

export interface ToolError {
  type: ToolErrorType;
  message: string;
  toolName: string;
}

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  /** Register a tool.  Throws if the name is already taken. */
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered.`);
    }
    this.tools.set(tool.name, tool);
  }

  /** Unregister a tool by name. */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /** Look up a single tool by name. */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /** List all registered tools. */
  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /** List only read-only tools. */
  listReadTools(): ToolDefinition[] {
    return this.list().filter((t) => t.permission === "read");
  }

  /** List only write tools. */
  listWriteTools(): ToolDefinition[] {
    return this.list().filter((t) => t.permission === "write");
  }

  /**
   * Execute a tool by name.
   * - Enforces that write tools require confirmation (throws if
   *   `confirmation.required` is true and `confirmed` is false).
   * - Wraps timeouts and maps rejections to `ToolError`.
   */
  async execute(
    name: string,
    input: ToolInputSchema,
    confirmed = false,
  ): Promise<ToolOutputSchema> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw this.makeError("not_found", `Tool "${name}" not found.`, name);
    }

    // Write-guard: must be confirmed
    if (
      tool.permission === "write" &&
      tool.confirmation.required &&
      !confirmed
    ) {
      throw this.makeError(
        "permission_denied",
        `Tool "${name}" requires confirmation before execution.`,
        name,
      );
    }

    // Timeout guard
    return this.withTimeout(tool, input, tool.timeoutMs);
  }

  private async withTimeout(
    tool: ToolDefinition,
    input: ToolInputSchema,
    timeoutMs: number,
  ): Promise<ToolOutputSchema> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          this.makeError(
            "timeout",
            `Tool "${tool.name}" timed out.`,
            tool.name,
          ),
        );
      }, timeoutMs);

      tool
        .execute(input)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err: unknown) => {
          clearTimeout(timer);
          if (err && typeof err === "object" && "type" in err) {
            reject(err); // already a ToolError
          } else {
            const message = err instanceof Error ? err.message : String(err);
            reject(this.makeError("execution_failed", message, tool.name));
          }
        });
    });
  }

  private makeError(
    type: ToolErrorType,
    message: string,
    toolName: string,
  ): ToolError {
    return { type, message, toolName };
  }
}

// ---------------------------------------------------------------------------
// Default registry instance (shared across the addon)
// ---------------------------------------------------------------------------

export const defaultRegistry = new ToolRegistry();

// ---------------------------------------------------------------------------
// Input/output schemas for built-in tools
// ---------------------------------------------------------------------------

/** Input for search_library */
export interface SearchLibraryInput {
  query: string;
  scope?: "library" | "collection" | "item";
}

/** Output for search_library */
export interface SearchLibraryOutput {
  items: EvidenceChunk[];
  total: number;
}

/** Input for read_item */
export interface ReadItemInput {
  itemKey: string;
}

/** Output for read_item */
export interface ReadItemOutput {
  itemKey: string;
  title: string;
  creators: string[];
  year?: string;
  abstract?: string;
  tags: string[];
  itemType: string;
  raw?: Record<string, unknown>;
}

/** Input for get_annotations */
export interface GetAnnotationsInput {
  itemKey: string;
}

/** Output for get_annotations */
export interface GetAnnotationsOutput {
  itemKey: string;
  annotations: EvidenceChunk[];
  total: number;
}

// ---------------------------------------------------------------------------
// Tool implementations (read-only)
// ---------------------------------------------------------------------------

/**
 * search_library: search the Zotero library by query.
 */
export const searchLibraryTool: ToolDefinition<
  SearchLibraryInput,
  SearchLibraryOutput
> = {
  name: "search_library",
  description:
    "Search the Zotero library for items matching a query string. " +
    "Returns a list of EvidenceChunk objects with title, authors, and year.",
  inputSchema: { query: "", scope: "library" },
  outputSchema: { items: [], total: 0 },
  permission: "read",
  confirmation: { required: false, reason: "" },
  timeoutMs: 30_000,
  async execute(input) {
    const query = input.query.toLowerCase();
    const results: EvidenceChunk[] = [];

    // Walk all library items (simplified; real impl would use Zotero.Search)
    const library = Zotero.getActiveZoteroDatabase
      ? Zotero.getActiveZoteroDatabase()
      : null;
    const items = Zotero.Items ? (Zotero.Items.getAll?.() ?? []) : [];

    for (const item of items) {
      if (!item || typeof item.getField !== "function") continue;
      const title =
        (item.getField("title") as string) ||
        (item.getDisplayTitle && item.getDisplayTitle()) ||
        "";
      const abstract = (item.getField("abstractNote") as string) || "";
      if (
        !title.toLowerCase().includes(query) &&
        !abstract.toLowerCase().includes(query)
      ) {
        continue;
      }
      const key = item.key || "";
      results.push({
        itemKey: key,
        label: title,
        snippet: abstract.slice(0, 200),
      });
      if (results.length >= 50) break; // bounded
    }

    return { items: results, total: results.length };
  },
};

/**
 * read_item: retrieve metadata for a single Zotero item.
 */
export const readItemTool: ToolDefinition<ReadItemInput, ReadItemOutput> = {
  name: "read_item",
  description:
    "Read metadata for a single Zotero item given its itemKey. " +
    "Returns title, creators, year, abstract, tags, and itemType.",
  inputSchema: { itemKey: "" },
  outputSchema: {
    itemKey: "",
    title: "",
    creators: [],
    year: "",
    abstract: "",
    tags: [],
    itemType: "",
  },
  permission: "read",
  confirmation: { required: false, reason: "" },
  timeoutMs: 15_000,
  async execute(input) {
    const item = Zotero.Items.getByKey
      ? Zotero.Items.getByKey(input.itemKey)
      : null;
    if (!item) {
      throw {
        type: "not_found",
        message: `Item "${input.itemKey}" not found.`,
        toolName: "read_item",
      };
    }
    const creators = (item.getCreators?.() ?? []).map(
      (c: any) => c.name || c.lastName || "",
    );
    const tags = (item.getTags?.() ?? []).map((t: any) => t.tag || t);

    return {
      itemKey: input.itemKey,
      title: (item.getField("title") as string) || "",
      creators,
      year:
        (item.getField("year") as string) ||
        (item.getField("date") as string) ||
        "",
      abstract: (item.getField("abstractNote") as string) || "",
      tags,
      itemType: item.itemType || "",
    };
  },
};

/**
 * get_annotations: retrieve annotations (highlights/notes) for an item.
 */
export const getAnnotationsTool: ToolDefinition<
  GetAnnotationsInput,
  GetAnnotationsOutput
> = {
  name: "get_annotations",
  description:
    "Get annotations (highlights, notes) attached to a Zotero item. " +
    "Returns a list of EvidenceChunk objects, one per annotation.",
  inputSchema: { itemKey: "" },
  outputSchema: { itemKey: "", annotations: [], total: 0 },
  permission: "read",
  confirmation: { required: false, reason: "" },
  timeoutMs: 15_000,
  async execute(input) {
    const item = Zotero.Items.getByKey
      ? Zotero.Items.getByKey(input.itemKey)
      : null;
    if (!item) {
      throw {
        type: "not_found",
        message: `Item "${input.itemKey}" not found.`,
        toolName: "get_annotations",
      };
    }

    const annotations: EvidenceChunk[] = [];

    // Try to get child annotations (Zotero 6+)
    const children =
      typeof item.getChildren === "function" ? item.getChildren() : [];
    for (const child of children) {
      if (child.itemType === "annotation") {
        const text = (child.getNote?.() as string) || "";
        annotations.push({
          itemKey: input.itemKey,
          label: `Annotation on ${input.itemKey}`,
          snippet: text.slice(0, 300),
          annotationKey: child.key || "",
        });
      }
    }

    return { itemKey: input.itemKey, annotations, total: annotations.length };
  },
};

// ---------------------------------------------------------------------------
// Write-tool stubs (disabled by default)
// ---------------------------------------------------------------------------

export interface CreateNoteInput {
  itemKey: string;
  markdown: string;
}

export interface CreateNoteOutput {
  noteKey: string;
  itemKey: string;
}

export const createNoteTool: ToolDefinition<CreateNoteInput, CreateNoteOutput> =
  {
    name: "create_note",
    description:
      "Create a new note attached to a Zotero item. " +
      "REQUIRES user confirmation before execution.",
    inputSchema: { itemKey: "", markdown: "" },
    outputSchema: { noteKey: "", itemKey: "" },
    permission: "write",
    confirmation: {
      required: true,
      reason: "Writing notes modifies the Zotero library.",
    },
    timeoutMs: 15_000,
    async execute(input) {
      // Stub implementation – real one would call Zotero.Items.createChildNote
      void input;
      throw {
        type: "execution_failed",
        message: "create_note is not yet implemented.",
        toolName: "create_note",
      };
    },
  };

// ---------------------------------------------------------------------------
// Register built-in tools with the default registry
// ---------------------------------------------------------------------------

defaultRegistry.register(searchLibraryTool);
defaultRegistry.register(readItemTool);
defaultRegistry.register(getAnnotationsTool);
defaultRegistry.register(createNoteTool);
