/**
 * MCP Client Module for Zotero AI Newton
 *
 * @experimental This module is experimental and subject to change.
 * It provides read-only MCP integration for selected Zotero context.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  type Resource,
  type Tool,
  type ReadResourceResult,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { getPref, setPref } from "../utils/prefs";

// Experimental feature flag
const MCP_ENABLED_PREF = "mcp.enabled";
const MCP_SERVER_CMD_PREF = "mcp.serverCmd";
const MCP_SERVER_ARGS_PREF = "mcp.serverArgs";
const MCP_ANNOTATIONS_ENABLED_PREF = "mcp.annotationsEnabled";

export interface MCPConfig {
  enabled: boolean;
  serverCmd: string;
  serverArgs: string[];
  annotationsEnabled: boolean;
}

export interface ZoteroSelection {
  items: ZoteroItem[];
  collections: ZoteroCollection[];
  activeReader: ZoteroReader | null;
}

export interface ZoteroItem {
  key: string;
  title: string;
  creators: Array<{ firstName: string; lastName: string }>;
  itemType: string;
  date: string;
  publicationTitle?: string;
  doi?: string;
  url?: string;
  tags: string[];
  abstractNote: string;
  attachments: ZoteroAttachment[];
}

export interface ZoteroCollection {
  key: string;
  name: string;
  parentKey: string | null;
}

export interface ZoteroReader {
  itemKey: string;
  page: number;
  selection: string | null;
}

export interface ZoteroAttachment {
  key: string;
  title: string;
  mimeType: string;
}

export interface ZoteroAnnotation {
  key: string;
  type: "highlight" | "note" | "ink";
  text: string;
  page: number;
  position: Record<string, unknown>;
}

export interface EvidenceChunk {
  id: string;
  text: string;
  metadata: {
    itemKey: string;
    page?: number;
    section?: string;
  };
}

/**
 * MCP Client for Zotero AI Newton
 *
 * @experimental This class is experimental and provides read-only access to
 * selected Zotero context via the Model Context Protocol.
 */
export class ZoteroMCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private config: MCPConfig;
  private connected: boolean = false;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load MCP configuration from preferences
   */
  private loadConfig(): MCPConfig {
    const enabled = getPref(MCP_ENABLED_PREF) === true;
    const serverCmd = String(getPref(MCP_SERVER_CMD_PREF) || "");
    const serverArgsStr = String(getPref(MCP_SERVER_ARGS_PREF) || "[]");

    let serverArgs: string[];
    try {
      serverArgs = JSON.parse(serverArgsStr);
    } catch {
      serverArgs = [];
    }

    const annotationsEnabled = getPref(MCP_ANNOTATIONS_ENABLED_PREF) === true;

    return {
      enabled,
      serverCmd,
      serverArgs,
      annotationsEnabled,
    };
  }

  /**
   * Save MCP configuration to preferences
   */
  saveConfig(config: Partial<MCPConfig>): void {
    if (config.enabled !== undefined) {
      setPref(MCP_ENABLED_PREF, config.enabled);
      this.config.enabled = config.enabled;
    }
    if (config.serverCmd !== undefined) {
      setPref(MCP_SERVER_CMD_PREF, config.serverCmd);
      this.config.serverCmd = config.serverCmd;
    }
    if (config.serverArgs !== undefined) {
      setPref(MCP_SERVER_ARGS_PREF, JSON.stringify(config.serverArgs));
      this.config.serverArgs = config.serverArgs;
    }
    if (config.annotationsEnabled !== undefined) {
      setPref(MCP_ANNOTATIONS_ENABLED_PREF, config.annotationsEnabled);
      this.config.annotationsEnabled = config.annotationsEnabled;
    }
  }

  /**
   * Check if MCP integration is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Connect to the MCP server
   *
   * @experimental Connection handling is subject to change.
   */
  async connect(): Promise<void> {
    if (!this.config.enabled) {
      throw new Error("MCP integration is disabled. Enable it in preferences.");
    }

    if (!this.config.serverCmd) {
      throw new Error("MCP server command not configured.");
    }

    if (this.connected && this.client) {
      return;
    }

    try {
      this.transport = new StdioClientTransport({
        command: this.config.serverCmd,
        args: this.config.serverArgs,
      });

      this.client = new Client(
        {
          name: "zotero-ai-newton-mcp",
          version: "0.0.1-beta",
        },
        {
          capabilities: {
            resources: {},
            tools: {},
          },
        },
      );

      await this.client.connect(this.transport);
      this.connected = true;

      console.log("[MCP Client] Connected to server:", this.config.serverCmd);
    } catch (error) {
      this.connected = false;
      this.client = null;
      this.transport = null;
      // Wrap error with context, preserving original as cause
      const message = `Failed to connect to MCP server: ${error instanceof Error ? error.message : String(error)}`;
      const wrappedError = new Error(message);
      if (error instanceof Error) {
        wrappedError.cause = error;
      }
      throw wrappedError;
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    this.client = null;
    this.connected = false;
    console.log("[MCP Client] Disconnected from server");
  }

  /**
   * Get the current Zotero selection context
   * This is the only data that will be exposed via MCP (read-only)
   */
  private getSelectionContext(): ZoteroSelection {
    const zotero = (globalThis as any).Zotero;
    if (!zotero) {
      return { items: [], collections: [], activeReader: null };
    }

    const selectedItems: ZoteroItem[] = [];
    const selectedCollections: ZoteroCollection[] = [];

    // Get selected items
    const items = zotero.getActiveZoteroWindow()?.getSelectedItems?.() || [];
    for (const item of items) {
      selectedItems.push({
        key: item.key,
        title: item.getField("title") || "",
        creators: this.getCreators(item),
        itemType: item.itemType,
        date: item.getField("date") || "",
        publicationTitle: item.getField("publicationTitle") || "",
        doi: item.getField("DOI") || "",
        url: item.getField("url") || "",
        tags: item.getTags().map((t: any) => t.tag),
        abstractNote: item.getField("abstractNote") || "",
        attachments: this.getAttachments(item),
      });
    }

    // Get selected collections (if available)
    const collections =
      zotero.getActiveZoteroWindow()?.getSelectedCollection?.() || null;
    if (collections) {
      selectedCollections.push({
        key: collections.key,
        name: collections.name,
        parentKey: collections.parentKey || null,
      });
    }

    // Get active reader context (if available)
    let activeReader: ZoteroReader | null = null;
    const reader = zotero.Reader?.getActiveReader?.();
    if (reader) {
      activeReader = {
        itemKey: reader.itemKey,
        page: reader.page || 1,
        selection: reader.selection?.text || null,
      };
    }

    return {
      items: selectedItems,
      collections: selectedCollections,
      activeReader,
    };
  }

  /**
   * Get creators from a Zotero item
   */
  private getCreators(
    item: any,
  ): Array<{ firstName: string; lastName: string }> {
    const creators: Array<{ firstName: string; lastName: string }> = [];
    const creatorTypes = item.getCreators();
    for (const creator of creatorTypes) {
      creators.push({
        firstName: creator.firstName || "",
        lastName: creator.lastName || "",
      });
    }
    return creators;
  }

  /**
   * Get attachments from a Zotero item
   */
  private getAttachments(item: any): ZoteroAttachment[] {
    const attachments: ZoteroAttachment[] = [];
    const attachmentItems = item.getAttachments();
    for (const attKey of attachmentItems) {
      const att = (globalThis as any).Zotero.Items.getByKey(attKey);
      if (att) {
        attachments.push({
          key: att.key,
          title: att.getField("title") || "",
          mimeType: att.attachmentMIMEType || "application/octet-stream",
        });
      }
    }
    return attachments;
  }

  /**
   * Check if a resource URI is allowed based on current selection
   */
  private isResourceAllowed(uri: string): boolean {
    const selection = this.getSelectionContext();
    const selectedItemKeys = new Set(selection.items.map((i) => i.key));
    const selectedCollectionKeys = new Set(
      selection.collections.map((c) => c.key),
    );

    // zotero://selection is always allowed if there are selected items
    if (uri === "zotero://selection") {
      return selection.items.length > 0;
    }

    // zotero://item/{key} is allowed only if item is selected
    if (uri.startsWith("zotero://item/")) {
      const itemKey = uri.replace("zotero://item/", "");
      return selectedItemKeys.has(itemKey);
    }

    // zotero://collection/{key} is allowed only if collection is selected
    if (uri.startsWith("zotero://collection/")) {
      const collectionKey = uri.replace("zotero://collection/", "");
      return selectedCollectionKeys.has(collectionKey);
    }

    // zotero://library is not allowed (read-only, selection-scoped)
    if (uri === "zotero://library") {
      return false;
    }

    return false;
  }

  /**
   * Read an MCP resource (read-only, selection-scoped)
   *
   * @experimental Resource shapes are subject to change.
   */
  async readResource(uri: string): Promise<ReadResourceResult> {
    if (!this.isEnabled()) {
      throw new Error("MCP integration is disabled.");
    }

    if (!this.isResourceAllowed(uri)) {
      throw new Error(
        `Access denied: resource "${uri}" is not in the current selection scope.`,
      );
    }

    const selection = this.getSelectionContext();

    if (uri === "zotero://selection") {
      const resource: Resource = {
        uri: "zotero://selection",
        mimeType: "application/json",
        text: JSON.stringify({ items: selection.items }, null, 2),
      };

      return { contents: [resource] };
    }

    if (uri.startsWith("zotero://item/")) {
      const itemKey = uri.replace("zotero://item/", "");
      const item = selection.items.find((i) => i.key === itemKey);

      if (!item) {
        throw new Error(`Item "${itemKey}" not found in selection.`);
      }

      const resource: Resource = {
        uri: uri,
        mimeType: "application/json",
        text: JSON.stringify(item, null, 2),
      };

      return { contents: [resource] };
    }

    if (uri.startsWith("zotero://collection/")) {
      const collectionKey = uri.replace("zotero://collection/", "");
      const collection = selection.collections.find(
        (c) => c.key === collectionKey,
      );

      if (!collection) {
        throw new Error(
          `Collection "${collectionKey}" not found in selection.`,
        );
      }

      const resource: Resource = {
        uri: uri,
        mimeType: "application/json",
        text: JSON.stringify(collection, null, 2),
      };

      return { contents: [resource] };
    }

    throw new Error(`Unknown resource URI: ${uri}`);
  }

  /**
   * Call an MCP tool (read-only, selection-scoped)
   *
   * @experimental Tool definitions are subject to change.
   */
  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<CallToolResult> {
    if (!this.isEnabled()) {
      throw new Error("MCP integration is disabled.");
    }

    // All tools are read-only by design
    switch (name) {
      case "search_library":
        return this.searchLibrary(args);
      case "read_item":
        return this.readItem(args);
      case "get_annotations":
        return this.getAnnotations(args);
      case "read_evidence_chunks":
        return this.readEvidenceChunks(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Search Zotero library (read-only)
   */
  private async searchLibrary(
    args: Record<string, unknown>,
  ): Promise<CallToolResult> {
    const query = String(args.query || "");
    const limit = Number(args.limit) || 10;

    if (!query) {
      throw new Error("Query is required for search_library.");
    }

    const zotero = (globalThis as any).Zotero;
    const results: Array<{
      key: string;
      title: string;
      date: string;
      relevance: number;
    }> = [];

    // Simple search in selected items only (read-only, selection-scoped)
    const selection = this.getSelectionContext();
    for (const item of selection.items) {
      const searchText =
        `${item.title} ${item.abstractNote} ${item.tags.join(" ")}`.toLowerCase();
      if (searchText.includes(query.toLowerCase())) {
        results.push({
          key: item.key,
          title: item.title,
          date: item.date,
          relevance: 1.0, // Simple relevance for now
        });
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results.slice(0, limit), null, 2),
        },
      ],
    };
  }

  /**
   * Read item metadata (read-only)
   */
  private async readItem(
    args: Record<string, unknown>,
  ): Promise<CallToolResult> {
    const itemKey = String(args.itemKey || "");

    if (!itemKey) {
      throw new Error("itemKey is required for read_item.");
    }

    // Check if item is in selection scope
    if (!this.isResourceAllowed(`zotero://item/${itemKey}`)) {
      throw new Error(
        `Access denied: item "${itemKey}" is not in the current selection scope.`,
      );
    }

    const selection = this.getSelectionContext();
    const item = selection.items.find((i) => i.key === itemKey);

    if (!item) {
      throw new Error(`Item "${itemKey}" not found in selection.`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(item, null, 2),
        },
      ],
    };
  }

  /**
   * Get annotations from PDF attachments (opt-in, read-only)
   */
  private async getAnnotations(
    args: Record<string, unknown>,
  ): Promise<CallToolResult> {
    if (!this.config.annotationsEnabled) {
      throw new Error(
        "Annotations access is not enabled. Enable it in preferences.",
      );
    }

    const itemKey = String(args.itemKey || "");
    const attachmentKey = args.attachmentKey
      ? String(args.attachmentKey)
      : undefined;

    if (!itemKey) {
      throw new Error("itemKey is required for get_annotations.");
    }

    // Check selection scope
    if (!this.isResourceAllowed(`zotero://item/${itemKey}`)) {
      throw new Error(
        `Access denied: item "${itemKey}" is not in the current selection scope.`,
      );
    }

    // In a real implementation, this would fetch annotations from Zotero
    // For now, return a placeholder
    const annotations: ZoteroAnnotation[] = [];

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(annotations, null, 2),
        },
      ],
    };
  }

  /**
   * Read evidence chunks (compatible with issue #27, read-only)
   */
  private async readEvidenceChunks(
    args: Record<string, unknown>,
  ): Promise<CallToolResult> {
    const itemKey = String(args.itemKey || "");
    const chunkSize = Number(args.chunkSize) || 500;

    if (!itemKey) {
      throw new Error("itemKey is required for read_evidence_chunks.");
    }

    // Check selection scope
    if (!this.isResourceAllowed(`zotero://item/${itemKey}`)) {
      throw new Error(
        `Access denied: item "${itemKey}" is not in the current selection scope.`,
      );
    }

    const selection = this.getSelectionContext();
    const item = selection.items.find((i) => i.key === itemKey);

    if (!item) {
      throw new Error(`Item "${itemKey}" not found in selection.`);
    }

    // Create simple evidence chunks from item metadata
    const chunks: EvidenceChunk[] = [];
    const text = `${item.title}\n\n${item.abstractNote}`;
    const words = text.split(/\s+/);

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunkText = words.slice(i, i + chunkSize).join(" ");
      chunks.push({
        id: `${itemKey}_${Math.floor(i / chunkSize)}`,
        text: chunkText,
        metadata: {
          itemKey,
          section: "abstract",
        },
      });
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(chunks, null, 2),
        },
      ],
    };
  }

  /**
   * List available MCP resources (read-only, selection-scoped)
   */
  async listResources(): Promise<Resource[]> {
    if (!this.isEnabled()) {
      return [];
    }

    const selection = this.getSelectionContext();
    const resources: Resource[] = [];

    // zotero://selection
    if (selection.items.length > 0) {
      resources.push({
        uri: "zotero://selection",
        mimeType: "application/json",
        name: "Selected Zotero Items",
        description: "Metadata for currently selected Zotero items",
      });
    }

    // zotero://item/{key} for each selected item
    for (const item of selection.items) {
      resources.push({
        uri: `zotero://item/${item.key}`,
        mimeType: "application/json",
        name: item.title,
        description: `Metadata for Zotero item ${item.key}`,
      });
    }

    // zotero://collection/{key} for each selected collection
    for (const collection of selection.collections) {
      resources.push({
        uri: `zotero://collection/${collection.key}`,
        mimeType: "application/json",
        name: collection.name,
        description: `Metadata for Zotero collection ${collection.key}`,
      });
    }

    return resources;
  }

  /**
   * List available MCP tools (read-only)
   */
  async listTools(): Promise<Tool[]> {
    if (!this.isEnabled()) {
      return [];
    }

    const tools: Tool[] = [
      {
        name: "search_library",
        description:
          "[EXPERIMENTAL] Search the current Zotero selection (read-only)",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query",
            },
            limit: {
              type: "number",
              description: "Maximum number of results (default: 10)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "read_item",
        description:
          "[EXPERIMENTAL] Read metadata for a selected Zotero item (read-only)",
        inputSchema: {
          type: "object",
          properties: {
            itemKey: {
              type: "string",
              description: "Zotero item key",
            },
          },
          required: ["itemKey"],
        },
      },
    ];

    // Only expose get_annotations if enabled
    if (this.config.annotationsEnabled) {
      tools.push({
        name: "get_annotations",
        description:
          "[EXPERIMENTAL] Get annotations from PDF attachments (read-only, opt-in)",
        inputSchema: {
          type: "object",
          properties: {
            itemKey: {
              type: "string",
              description: "Zotero item key",
            },
            attachmentKey: {
              type: "string",
              description: "Attachment key (optional)",
            },
          },
          required: ["itemKey"],
        },
      });
    }

    // read_evidence_chunks (compatible with #27)
    tools.push({
      name: "read_evidence_chunks",
      description:
        "[EXPERIMENTAL] Read evidence chunks from a selected item (read-only)",
      inputSchema: {
        type: "object",
        properties: {
          itemKey: {
            type: "string",
            description: "Zotero item key",
          },
          chunkSize: {
            type: "number",
            description: "Chunk size in words (default: 500)",
          },
        },
        required: ["itemKey"],
      },
    });

    return tools;
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get current configuration
   */
  getConfig(): MCPConfig {
    return { ...this.config };
  }
}

/**
 * Create a singleton instance of the MCP client
 */
let mcpClientInstance: ZoteroMCPClient | null = null;

export function getMCPClient(): ZoteroMCPClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new ZoteroMCPClient();
  }
  return mcpClientInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetMCPClient(): void {
  if (mcpClientInstance) {
    mcpClientInstance.disconnect();
  }
  mcpClientInstance = null;
}
