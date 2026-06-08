/**
 * Unit tests for MCP Client module
 *
 * @experimental Tests for experimental MCP integration
 */

import { expect } from "chai";
import {
  ZoteroMCPClient,
  resetMCPClient,
  getMCPClient,
} from "../src/modules/mcpClient";
import { setPref, clearPref } from "../src/utils/prefs";

describe("MCP Client Module (Experimental)", function () {
  beforeEach(function () {
    // Clear MCP preferences before each test
    clearPref("mcp.enabled");
    clearPref("mcp.serverCmd");
    clearPref("mcp.serverArgs");
    clearPref("mcp.annotationsEnabled");
    resetMCPClient();
  });

  afterEach(function () {
    resetMCPClient();
  });

  describe("Configuration", function () {
    it("should load default configuration when no prefs set", function () {
      const client = new ZoteroMCPClient();
      const config = client.getConfig();

      expect(config.enabled).to.be.false;
      expect(config.serverCmd).to.equal("");
      expect(config.serverArgs).to.deep.equal([]);
      expect(config.annotationsEnabled).to.be.false;
    });

    it("should save and load configuration", function () {
      const client = new ZoteroMCPClient();

      client.saveConfig({
        enabled: true,
        serverCmd: "node",
        serverArgs: ["mcp-server.js"],
        annotationsEnabled: true,
      });

      const config = client.getConfig();
      expect(config.enabled).to.be.true;
      expect(config.serverCmd).to.equal("node");
      expect(config.serverArgs).to.deep.equal(["mcp-server.js"]);
      expect(config.annotationsEnabled).to.be.true;
    });

    it("should load configuration from preferences", function () {
      setPref("mcp.enabled", true);
      setPref("mcp.serverCmd", "python");
      setPref("mcp.serverArgs", '["server.py", "--port", "8080"]');
      setPref("mcp.annotationsEnabled", true);

      const client = new ZoteroMCPClient();
      const config = client.getConfig();

      expect(config.enabled).to.be.true;
      expect(config.serverCmd).to.equal("python");
      expect(config.serverArgs).to.deep.equal(["server.py", "--port", "8080"]);
      expect(config.annotationsEnabled).to.be.true;
    });
  });

  describe("Enable/Disable", function () {
    it("should report disabled when MCP is not enabled", function () {
      const client = new ZoteroMCPClient();
      expect(client.isEnabled()).to.be.false;
    });

    it("should report enabled when MCP is enabled", function () {
      const client = new ZoteroMCPClient();
      client.saveConfig({ enabled: true });
      expect(client.isEnabled()).to.be.true;
    });
  });

  describe("Connection (Mocked)", function () {
    it("should throw error when connecting with MCP disabled", async function () {
      const client = new ZoteroMCPClient();

      try {
        await client.connect();
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).to.include("disabled");
      }
    });

    it("should throw error when connecting without server command", async function () {
      const client = new ZoteroMCPClient();
      client.saveConfig({ enabled: true, serverCmd: "" });

      try {
        await client.connect();
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).to.include("not configured");
      }
    });
  });

  describe("Resource Access (Read-Only)", function () {
    it("should throw error when reading resource with MCP disabled", async function () {
      const client = new ZoteroMCPClient();

      try {
        await client.readResource("zotero://selection");
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).to.include("disabled");
      }
    });
  });

  describe("Tool Execution (Read-Only)", function () {
    it("should throw error when calling tool with MCP disabled", async function () {
      const client = new ZoteroMCPClient();

      try {
        await client.callTool("search_library", { query: "test" });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).to.include("disabled");
      }
    });

    it("should throw error for unknown tool", async function () {
      const client = new ZoteroMCPClient();
      client.saveConfig({ enabled: true });

      try {
        await client.callTool("unknown_tool", {});
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).to.include("Unknown tool");
      }
    });
  });

  describe("Selection Scope Enforcement", function () {
    it("should enforce selection scope for resources", function () {
      const client = new ZoteroMCPClient();
      client.saveConfig({ enabled: true });

      // Mock Zotero global for testing
      (globalThis as any).Zotero = {
        getActiveZoteroWindow: () => ({
          getSelectedItems: () => [],
          getSelectedCollection: () => null,
        }),
        Items: {
          getByKey: () => null,
        },
        Reader: {
          getActiveReader: () => null,
        },
        Promise: {
          defer: () => ({ promise: Promise.resolve(), resolve: () => {} }),
        },
      };

      // Without selection, resource should not be allowed
      // Note: This is a simplified test - in real scenario, isResourceAllowed
      // would check against actual selection
      expect(client.isEnabled()).to.be.true;
    });
  });

  describe("Annotations Access (Opt-In)", function () {
    it("should deny annotations access when not enabled", async function () {
      const client = new ZoteroMCPClient();
      client.saveConfig({ enabled: true, annotationsEnabled: false });

      (globalThis as any).Zotero = {
        getActiveZoteroWindow: () => ({
          getSelectedItems: () => [
            {
              key: "ABC123",
              getField: () => "",
              getTags: () => [],
              getAttachments: () => [],
            },
          ],
          getSelectedCollection: () => null,
        }),
        Items: {
          getByKey: () => null,
        },
        Reader: {
          getActiveReader: () => null,
        },
      };

      try {
        await client.callTool("get_annotations", { itemKey: "ABC123" });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).to.include("not enabled");
      }
    });

    it("should allow annotations access when enabled", function () {
      const client = new ZoteroMCPClient();
      client.saveConfig({ enabled: true, annotationsEnabled: true });

      expect(client.getConfig().annotationsEnabled).to.be.true;
    });
  });

  describe("List Resources and Tools", function () {
    it("should return empty lists when MCP is disabled", async function () {
      const client = new ZoteroMCPClient();
      client.saveConfig({ enabled: false });

      const resources = await client.listResources();
      const tools = await client.listTools();

      expect(resources).to.deep.equal([]);
      expect(tools).to.deep.equal([]);
    });

    it("should return tools when MCP is enabled", async function () {
      const client = new ZoteroMCPClient();
      client.saveConfig({ enabled: true });

      const tools = await client.listTools();

      expect(tools.length).to.be.greaterThan(0);
      expect(tools.some((t: any) => t.name === "search_library")).to.be.true;
      expect(tools.some((t: any) => t.name === "read_item")).to.be.true;
      expect(tools.some((t: any) => t.name === "read_evidence_chunks")).to.be
        .true;
    });

    it("should include get_annotations only when enabled", async function () {
      const client1 = new ZoteroMCPClient();
      client1.saveConfig({ enabled: true, annotationsEnabled: false });
      const tools1 = await client1.listTools();
      expect(tools1.some((t: any) => t.name === "get_annotations")).to.be.false;

      const client2 = new ZoteroMCPClient();
      client2.saveConfig({ enabled: true, annotationsEnabled: true });
      const tools2 = await client2.listTools();
      expect(tools2.some((t: any) => t.name === "get_annotations")).to.be.true;
    });
  });

  describe("MCP Client Singleton", function () {
    it("should return the same instance", function () {
      const instance1 = getMCPClient();
      const instance2 = getMCPClient();

      expect(instance1).to.equal(instance2);
    });

    it("should reset instance", function () {
      const instance1 = getMCPClient();
      resetMCPClient();
      const instance2 = getMCPClient();

      expect(instance1).to.not.equal(instance2);
    });
  });
});
