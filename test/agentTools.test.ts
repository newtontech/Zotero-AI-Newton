/* eslint-disable mocha/max-top-level-suites */

import { assert } from "chai";
import {
  ToolRegistry,
  ToolDefinition,
  ToolPermission,
  ToolErrorType,
  ToolError,
  EvidenceChunk,
  defaultRegistry,
  searchLibraryTool,
  readItemTool,
  getAnnotationsTool,
  createNoteTool,
  SearchLibraryInput,
  SearchLibraryOutput,
  ReadItemInput,
  ReadItemOutput,
  GetAnnotationsInput,
  GetAnnotationsOutput,
  CreateNoteInput,
  CreateNoteOutput,
} from "../src/modules/agentTools";

// ---------------------------------------------------------------------------
// EvidenceChunk
// ---------------------------------------------------------------------------

describe("EvidenceChunk model", function () {
  it("can be constructed with required fields", function () {
    const chunk: EvidenceChunk = {
      itemKey: "ABC123",
      label: "Test Paper",
      snippet: "This is a snippet.",
    };
    assert.strictEqual(chunk.itemKey, "ABC123");
    assert.strictEqual(chunk.label, "Test Paper");
    assert.strictEqual(chunk.snippet, "This is a snippet.");
  });

  it("can include optional page and annotationKey", function () {
    const chunk: EvidenceChunk = {
      itemKey: "DEF456",
      label: "Annotated Paper",
      snippet: "Annotated snippet.",
      page: 42,
      annotationKey: "ANN789",
    };
    assert.strictEqual(chunk.page, 42);
    assert.strictEqual(chunk.annotationKey, "ANN789");
  });
});

// ---------------------------------------------------------------------------
// ToolRegistry – registration
// ---------------------------------------------------------------------------

describe("ToolRegistry – registration", function () {
  let registry: ToolRegistry;

  beforeEach(function () {
    registry = new ToolRegistry();
  });

  it("registers a valid tool", function () {
    const tool: ToolDefinition = {
      name: "test_tool",
      description: "A test tool.",
      inputSchema: { query: "" },
      outputSchema: { result: "" },
      permission: "read" as ToolPermission,
      confirmation: { required: false, reason: "" },
      timeoutMs: 5000,
      execute: async (input: Record<string, unknown>) => ({
        result: `ran with ${String(input.query)}`,
      }),
    };

    registry.register(tool);
    assert.strictEqual(registry.list().length, 1);
    assert.strictEqual(registry.get("test_tool")?.name, "test_tool");
  });

  it("throws when registering a duplicate name", function () {
    const tool: ToolDefinition = {
      name: "dup_tool",
      description: "duplicate",
      inputSchema: {},
      outputSchema: {},
      permission: "read" as ToolPermission,
      confirmation: { required: false, reason: "" },
      timeoutMs: 5000,
      execute: async () => ({}),
    };
    registry.register(tool);
    assert.throws(() => registry.register(tool), /already registered/);
  });

  it("unregisters a tool by name", function () {
    const tool: ToolDefinition = {
      name: "temp_tool",
      description: "temporary",
      inputSchema: {},
      outputSchema: {},
      permission: "read" as ToolPermission,
      confirmation: { required: false, reason: "" },
      timeoutMs: 5000,
      execute: async () => ({}),
    };
    registry.register(tool);
    assert.isTrue(registry.unregister("temp_tool"));
    assert.isUndefined(registry.get("temp_tool"));
  });

  it("returns false when unregistering unknown tool", function () {
    assert.isFalse(registry.unregister("no_such_tool"));
  });
});

// ---------------------------------------------------------------------------
// ToolRegistry – listing helpers
// ---------------------------------------------------------------------------

describe("ToolRegistry – listing helpers", function () {
  let registry: ToolRegistry;

  beforeEach(function () {
    registry = new ToolRegistry();
  });

  it("listReadTools only returns read tools", function () {
    registry.register({
      name: "read_tool",
      description: "read",
      inputSchema: {},
      outputSchema: {},
      permission: "read",
      confirmation: { required: false, reason: "" },
      timeoutMs: 5000,
      execute: async () => ({}),
    });
    registry.register({
      name: "write_tool",
      description: "write",
      inputSchema: {},
      outputSchema: {},
      permission: "write",
      confirmation: { required: true, reason: "needs confirm" },
      timeoutMs: 5000,
      execute: async () => ({}),
    });

    assert.strictEqual(registry.listReadTools().length, 1);
    assert.strictEqual(registry.listReadTools()[0].name, "read_tool");
    assert.strictEqual(registry.listWriteTools().length, 1);
  });
});

// ---------------------------------------------------------------------------
// ToolRegistry – execution & permission guards
// ---------------------------------------------------------------------------

describe("ToolRegistry – execution", function () {
  let registry: ToolRegistry;

  beforeEach(function () {
    registry = new ToolRegistry();
  });

  it("executes a read tool successfully", async function () {
    registry.register({
      name: "echo",
      description: "echoes input",
      inputSchema: { msg: "" },
      outputSchema: { echo: "" },
      permission: "read",
      confirmation: { required: false, reason: "" },
      timeoutMs: 5000,
      execute: async (input: Record<string, unknown>) => ({
        echo: String(input.msg),
      }),
    });

    const result = await registry.execute("echo", { msg: "hello" });
    assert.strictEqual((result as Record<string, unknown>)["echo"], "hello");
  });

  it("throws not_found for unknown tool", async function () {
    try {
      await registry.execute("no_such_tool", {});
      assert.fail("should have thrown");
    } catch (err: unknown) {
      const e = err as ToolError;
      assert.strictEqual(e.type, "not_found");
      assert.include(e.message, "not found");
    }
  });

  it("blocks write tool without confirmation", async function () {
    registry.register({
      name: "dangerous_write",
      description: "writes something",
      inputSchema: {},
      outputSchema: {},
      permission: "write",
      confirmation: { required: true, reason: "needs user confirmation" },
      timeoutMs: 5000,
      execute: async () => ({}),
    });

    try {
      await registry.execute("dangerous_write", {}, false);
      assert.fail("should have thrown");
    } catch (err: unknown) {
      const e = err as ToolError;
      assert.strictEqual(e.type, "permission_denied");
      assert.include(e.message, "confirmation");
    }
  });

  it("allows write tool with confirmation", async function () {
    registry.register({
      name: "confirmed_write",
      description: "write with confirm",
      inputSchema: {},
      outputSchema: { ok: true },
      permission: "write",
      confirmation: { required: true, reason: "needs confirm" },
      timeoutMs: 5000,
      execute: async () => ({ ok: true }),
    });

    const result = await registry.execute("confirmed_write", {}, true);
    assert.isTrue((result as Record<string, unknown>)["ok"]);
  });

  it("times out slow tools", async function () {
    registry.register({
      name: "slow_tool",
      description: "very slow",
      inputSchema: {},
      outputSchema: {},
      permission: "read",
      confirmation: { required: false, reason: "" },
      timeoutMs: 50,
      execute: async () => {
        await new Promise((r) => setTimeout(r, 5000));
        return {};
      },
    });

    try {
      await registry.execute("slow_tool", {});
      assert.fail("should have timed out");
    } catch (err: unknown) {
      const e = err as ToolError;
      assert.strictEqual(e.type, "timeout");
    }
  });

  it("maps execution errors to ToolError", async function () {
    registry.register({
      name: "failing_tool",
      description: "always fails",
      inputSchema: {},
      outputSchema: {},
      permission: "read",
      confirmation: { required: false, reason: "" },
      timeoutMs: 5000,
      execute: async () => {
        throw new Error("boom");
      },
    });

    try {
      await registry.execute("failing_tool", {});
      assert.fail("should have thrown");
    } catch (err: unknown) {
      const e = err as ToolError;
      assert.strictEqual(e.type, "execution_failed");
      assert.include(e.message, "boom");
    }
  });
});

// ---------------------------------------------------------------------------
// Built-in tool stubs (type checks only – real Zotero not available in tests)
// ---------------------------------------------------------------------------

describe("Built-in tool definitions", function () {
  it("defaultRegistry has search_library", function () {
    const tool = defaultRegistry.get("search_library");
    assert.exists(tool);
    assert.strictEqual(tool?.permission, "read");
    assert.isFalse(tool?.confirmation.required);
  });

  it("defaultRegistry has read_item", function () {
    const tool = defaultRegistry.get("read_item");
    assert.exists(tool);
    assert.strictEqual(tool?.permission, "read");
  });

  it("defaultRegistry has get_annotations", function () {
    const tool = defaultRegistry.get("get_annotations");
    assert.exists(tool);
    assert.strictEqual(tool?.permission, "read");
  });

  it("create_note is registered as write tool with confirmation", function () {
    const tool = defaultRegistry.get("create_note");
    assert.exists(tool);
    assert.strictEqual(tool?.permission, "write");
    assert.isTrue(tool?.confirmation.required);
  });

  it("throws on write tool without confirmation", async function () {
    // create_note is registered but not implemented – calling it without
    // confirmation should throw 'permission_denied' before reaching execute
    try {
      await defaultRegistry.execute("create_note", {
        itemKey: "X",
        markdown: "# h",
      });
      assert.fail("should have thrown permission_denied");
    } catch (err: unknown) {
      const e = err as ToolError;
      assert.strictEqual(e.type, "permission_denied");
    }
  });
});
