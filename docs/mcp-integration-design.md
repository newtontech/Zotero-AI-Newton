# MCP Integration Design Document

**Status**: EXPERIMENTAL - Exploration Phase
**Issue**: #32
**Date**: 2026-06-09

## Overview

This document outlines the design for a read-only Model Context Protocol (MCP) integration for Zotero AI Newton. The integration allows the plugin to expose selected Zotero context as MCP resources and tools to compatible AI agents.

## Design Principles

1. **Read-Only**: No write operations to Zotero library
2. **Selection-Scoped**: Only expose currently selected items/collections
3. **Opt-In**: Disabled by default, requires explicit user activation
4. **Experimental**: Clearly marked as experimental, subject to change
5. **Privacy-First**: No automatic data sharing, user controls all exposure

## MCP Resource Mapping

### Resource URIs

```
zotero://selection                    # Currently selected items
zotero://item/{itemKey}              # Specific item by key
zotero://collection/{collectionKey}   # Specific collection
zotero://library                      # Library metadata (read-only)
```

### Resource Contents

#### `zotero://selection`

Returns a JSON array of selected items with metadata:

```json
{
  "uri": "zotero://selection",
  "mimeType": "application/json",
  "text": {
    "items": [
      {
        "key": "ABC123",
        "title": "Paper Title",
        "creators": [{ "firstName": "John", "lastName": "Doe" }],
        "itemType": "journalArticle",
        "date": "2024",
        "publicationTitle": "Journal Name",
        "doi": "10.xxxx/xxxxx",
        "url": "https://...",
        "tags": ["tag1", "tag2"],
        "abstractNote": "..."
      }
    ]
  }
}
```

#### `zotero://item/{itemKey}`

Returns full metadata for a specific item:

```json
{
  "uri": "zotero://item/ABC123",
  "mimeType": "application/json",
  "text": {
    "key": "ABC123",
    "title": "...",
    "creators": [...],
    "itemType": "...",
    "date": "...",
    "abstractNote": "...",
    "attachments": [
      {
        "key": "ATT456",
        "title": "PDF",
        "mimeType": "application/pdf",
        "url": "zotero://attachment/ATT456"
      }
    ]
  }
}
```

#### `zotero://collection/{collectionKey}`

Returns collection metadata and items:

```json
{
  "uri": "zotero://collection/COL789",
  "mimeType": "application/json",
  "text": {
    "key": "COL789",
    "name": "Collection Name",
    "parentKey": null,
    "items": [...]
  }
}
```

## MCP Tool Definitions

### `search_library`

Search the Zotero library with read-only access.

**Input**:

```json
{
  "query": "string (required)",
  "limit": "number (optional, default 10)"
}
```

**Output**:

```json
{
  "results": [
    {
      "key": "ABC123",
      "title": "...",
      "date": "...",
      "relevance": 0.95
    }
  ]
}
```

### `read_item`

Read full metadata for a specific item.

**Input**:

```json
{
  "itemKey": "string (required)"
}
```

**Output**: Item metadata (same as `zotero://item/{itemKey}` resource)

### `get_annotations`

Get annotations from PDF attachments (if explicitly enabled).

**Input**:

```json
{
  "itemKey": "string (required)",
  "attachmentKey": "string (optional)"
}
```

**Output**:

```json
{
  "annotations": [
    {
      "key": "ANN123",
      "type": "highlight|note|ink",
      "text": "...",
      "page": 5,
      "position": {...}
    }
  ]
}
```

### `read_evidence_chunks`

Return evidence chunks compatible with issue #27.

**Input**:

```json
{
  "itemKey": "string (required)",
  "chunkSize": "number (optional, default 500)"
}
```

**Output**:

```json
{
  "chunks": [
    {
      "id": "ABC123_0",
      "text": "...",
      "metadata": {
        "itemKey": "ABC123",
        "page": 1,
        "section": "..."
      }
    }
  ]
}
```

## Selection Scope Enforcement

### Current Selection Context

The MCP integration only exposes:

1. Currently selected items in the Zotero UI
2. Currently selected collection
3. Currently active reader/PDF (if open)
4. Annotations and notes only if explicitly enabled in preferences

### Enforcement Mechanism

```typescript
class MCPResourceProvider {
  // Only return resources for selected items
  async getResource(uri: string): Promise<Resource> {
    if (!this.isEnabled()) {
      throw new Error("MCP integration is disabled");
    }

    if (!this.isSelectionAllowed(uri)) {
      throw new Error("Access denied: resource not in current selection");
    }

    return this.fetchResource(uri);
  }

  private isSelectionAllowed(uri: string): boolean {
    const selection = Zotero.getActiveZoteroWindow().getSelectedItems();
    const selectedKeys = new Set(selection.map((item) => item.key));

    // Parse URI and check if it's in selection
    if (uri.startsWith("zotero://item/")) {
      const itemKey = uri.split("/").pop();
      return selectedKeys.has(itemKey);
    }

    if (uri === "zotero://selection") {
      return selection.length > 0;
    }

    return false;
  }
}
```

## Privacy and Permission Assumptions

### Data Exposure

1. **Selected Items Only**: Only metadata from user-selected items is exposed
2. **No Full Library Access**: MCP clients cannot browse the entire library
3. **No Private Data**: Attachments, notes, and annotations require explicit opt-in
4. **No Write Access**: All operations are read-only

### User Consent

1. User must explicitly enable MCP integration in preferences
2. User must configure which MCP server to connect to
3. User can revoke access at any time by disabling the feature
4. Clear UI indication when MCP integration is active

### Security Boundaries

1. MCP server connection is user-configured (command + args)
2. No automatic connections to external servers
3. All data exchange is logged for audit (optional)
4. Feature is clearly marked as experimental

## Read-Only Enforcement

### Tool Implementation

All MCP tools enforce read-only access:

```typescript
const readOnlyTools: ToolDefinition[] = [
  {
    name: "search_library",
    description: "Search Zotero library (read-only)",
    inputSchema: {...},
    handler: async (input) => {
      // Only search, no modifications
      return await this.searchReadOnly(input);
    }
  },
  {
    name: "read_item",
    description: "Read item metadata (read-only)",
    inputSchema: {...},
    handler: async (input) => {
      // Only read, no modifications
      return await this.readItemReadOnly(input);
    }
  }
  // No write tools exposed
];
```

### Transport Security

1. Stdio transport only (no HTTP/SSE in initial version)
2. Server command is user-configured and verified
3. No credentials passed to MCP server (read-only access)

## Implementation Plan

### Phase 1: Scaffolding (This Issue)

- [x] Design document (this file)
- [ ] MCP client module scaffolding
- [ ] Preference UI for MCP configuration
- [ ] Basic connection handling
- [ ] Unit tests for connection and enforcement

### Phase 2: Resource Exposure

- [ ] Implement `zotero://selection` resource
- [ ] Implement `zotero://item/{key}` resource
- [ ] Implement `zotero://collection/{key}` resource
- [ ] Test with mock MCP server

### Phase 3: Tool Implementation

- [ ] Implement `search_library` tool
- [ ] Implement `read_item` tool
- [ ] Implement `get_annotations` tool (opt-in)
- [ ] Implement `read_evidence_chunks` tool
- [ ] Test with compatible MCP clients

### Phase 4: Polish & Documentation

- [ ] Error handling and edge cases
- [ ] Performance optimization
- [ ] User documentation
- [ ] Privacy policy updates

## Manual Test Checklist

### Prerequisites

- [ ] Zotero with Zotero AI Newton plugin installed
- [ ] MCP-compatible client (e.g., Claude Desktop with MCP support)
- [ ] Test Zotero library with items, collections, and PDFs

### Test Cases

#### 1. Preference UI

- [ ] MCP integration appears in preferences as "Experimental"
- [ ] Enable/disable toggle works correctly
- [ ] Server command configuration is saved correctly
- [ ] Default state is disabled

#### 2. Connection Handling

- [ ] Plugin connects to configured MCP server
- [ ] Connection error handling works
- [ ] Disconnection works cleanly
- [ ] Reconnection after preference change works

#### 3. Resource Exposure

- [ ] `zotero://selection` returns selected items
- [ ] `zotero://item/{key}` returns item metadata
- [ ] Non-selected items are not accessible
- [ ] Invalid URIs return appropriate errors

#### 4. Tool Execution

- [ ] `search_library` returns search results
- [ ] `read_item` returns item details
- [ ] `get_annotations` works only when enabled
- [ ] `read_evidence_chunks` returns chunks correctly

#### 5. Read-Only Enforcement

- [ ] No write operations are possible
- [ ] Attempted writes return clear errors
- [ ] Library state unchanged after MCP operations

#### 6. Selection Scope

- [ ] Only selected items are accessible
- [ ] Changing selection updates accessible resources
- [ ] No access to non-selected items

#### 7. Privacy

- [ ] No data sent without explicit enable
- [ ] Disabling feature disconnects server
- [ ] No background data collection

## References

- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Zotero API Documentation](https://www.zotero.org/support/dev/web_api/v3/start)
- [Issue #27: Evidence Chunks](https://github.com/newtontech/Zotero-AI-Newton/issues/27)
- [Issue #30: Tool Registry](https://github.com/newtontech/Zotero-AI-Newton/issues/30)
- [Issue #31: Security Boundaries](https://github.com/newtontech/Zotero-AI-Newton/issues/31)
