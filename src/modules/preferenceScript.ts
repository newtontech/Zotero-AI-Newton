import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";
import { DEFAULT_AI_SETTINGS, getProviderDefaults } from "./aiConfig";
import type { AISettingKey, AISettings } from "./aiConfig";

export async function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened
  // See addon/content/preferences.xhtml onpaneload
  const settings = loadSettingsFromPrefs();

  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
      columns: [
        {
          dataKey: "title",
          label: getString("prefs-table-title"),
          fixedWidth: true,
          width: 140,
        },
        {
          dataKey: "detail",
          label: getString("prefs-table-detail"),
        },
      ],
      rows: buildCapabilityRows(),
      settings,
    };
  } else {
    addon.data.prefs.window = _window;
    addon.data.prefs.settings = settings;
    addon.data.prefs.rows = buildCapabilityRows();
  }
  updatePrefsUI();
  bindPrefEvents();
}

function loadSettingsFromPrefs(): AISettings {
  const merged: Partial<AISettings> = { ...DEFAULT_AI_SETTINGS };
  Object.entries(DEFAULT_AI_SETTINGS).forEach(([key, fallback]) => {
    const value = getPref(key);
    if (value === undefined || value === null || value === "") {
      merged[key as AISettingKey] = fallback;
    } else {
      merged[key as AISettingKey] = String(value);
    }
  });

  const legacyOpenAIKey = getPref("openaiKey");
  const legacyOpenAIModel = getPref("openaiModel");
  const legacyDeepSeekKey = getPref("deepseekKey");
  const legacyDeepSeekModel = getPref("deepseekModel");

  if (!merged.apiKey && legacyOpenAIKey) {
    merged.provider = "openai";
    merged.apiKey = String(legacyOpenAIKey);
    merged.apiBase = "https://api.openai.com/v1";
    merged.apiModel = (legacyOpenAIModel as string) || "gpt-4o-mini";
  } else if (!merged.apiKey && legacyDeepSeekKey) {
    merged.provider = "deepseek";
    merged.apiKey = String(legacyDeepSeekKey);
    merged.apiBase = "https://api.deepseek.com";
    merged.apiModel = (legacyDeepSeekModel as string) || "deepseek-chat";
  }

  Object.entries(merged).forEach(([key, value]) =>
    setPref(key, value as string),
  );
  return merged as AISettings;
}

function buildCapabilityRows() {
  return [
    {
      title: getString("prefs-row-dialog"),
      detail: getString("prefs-row-dialog-desc"),
    },
    {
      title: getString("prefs-row-collection"),
      detail: getString("prefs-row-collection-desc"),
    },
    {
      title: getString("prefs-row-pdf"),
      detail: getString("prefs-row-pdf-desc"),
    },
    {
      title: getString("prefs-row-tone"),
      detail: getString("prefs-row-tone-desc"),
    },
  ];
}

async function updatePrefsUI() {
  // You can initialize some UI elements on prefs window
  // with addon.data.prefs.window.document
  // Or bind some events to the elements
  const renderLock = ztoolkit.getGlobal("Zotero").Promise.defer();
  if (addon.data.prefs?.window == undefined) return;
  const tableHelper = new ztoolkit.VirtualizedTable(addon.data.prefs?.window)
    .setContainerId(`${config.addonRef}-table-container`)
    .setProp({
      id: `${config.addonRef}-prefs-table`,
      // Do not use setLocale, as it modifies the Zotero.Intl.strings
      // Set locales directly to columns
      columns: addon.data.prefs?.columns,
      showHeader: true,
      multiSelect: true,
      staticColumns: true,
      disableFontSizeScaling: true,
    })
    .setProp("getRowCount", () => addon.data.prefs?.rows.length || 0)
    .setProp(
      "getRowData",
      (index) =>
        addon.data.prefs?.rows[index] || {
          title: "no data",
          detail: "no data",
        },
    )
    // No popup on selection; keep table focused on readability
    .setProp("onSelectionChange", () => true)
    // For find-as-you-type
    .setProp(
      "getRowString",
      (index) => addon.data.prefs?.rows[index].title || "",
    )
    // Render the table.
    .render(-1, () => {
      renderLock.resolve();
    });
  await renderLock.promise;
  ztoolkit.log("Preference table rendered!");
}

function bindPrefEvents() {
  const prefs = addon.data.prefs;
  if (!prefs?.window) return;
  const doc = prefs.window.document;
  if (!doc) return;
  if (!prefs.settings) {
    prefs.settings = { ...DEFAULT_AI_SETTINGS };
  }
  const settings = prefs.settings;
  const bindings: Array<{
    selector: string;
    key: AISettingKey;
    prop?: "value" | "checked";
  }> = [
    {
      selector: `#zotero-prefpane-${config.addonRef}-provider`,
      key: "provider",
    },
    {
      selector: `#zotero-prefpane-${config.addonRef}-conversation-mode`,
      key: "conversationMode",
    },
    {
      selector: `#zotero-prefpane-${config.addonRef}-api-base`,
      key: "apiBase",
    },
    {
      selector: `#zotero-prefpane-${config.addonRef}-api-key`,
      key: "apiKey",
    },
    {
      selector: `#zotero-prefpane-${config.addonRef}-api-model`,
      key: "apiModel",
    },
    {
      selector: `#zotero-prefpane-${config.addonRef}-agent-tone`,
      key: "agentTone",
    },
  ];

  bindings.forEach(({ selector, key }) => {
    const element = doc.querySelector(selector) as HTMLElement | null;
    if (!element) return;
    const applyValue = (next: string) => {
      if ("value" in (element as any)) {
        (element as any).value = next;
      }
      element.setAttribute("value", next);
      const menuitem = element.querySelector?.(
        `menuitem[value="${CSS.escape(next)}"]`,
      ) as any;
      if (menuitem && "selectedItem" in (element as any)) {
        (element as any).selectedItem = menuitem;
      }
    };

    const commitValue = (nextValue: string) => {
      settings[key] = nextValue;
      if (prefs.settings) {
        prefs.settings[key] = nextValue;
      }
      if (key === "provider") {
        const defaults = getProviderDefaults(nextValue);
        const apiBaseEl = doc.querySelector(
          `#zotero-prefpane-${config.addonRef}-api-base`,
        ) as HTMLInputElement | null;
        const apiModelEl = doc.querySelector(
          `#zotero-prefpane-${config.addonRef}-api-model`,
        ) as HTMLInputElement | null;
        const previousDefaults = Object.values({
          openai: getProviderDefaults("openai"),
          deepseek: getProviderDefaults("deepseek"),
          custom: getProviderDefaults("custom"),
        });
        const baseLooksDefault = previousDefaults.some(
          (provider) => provider.apiBase === settings.apiBase,
        );
        const modelLooksDefault = previousDefaults.some(
          (provider) => provider.model === settings.apiModel,
        );

        if (!settings.apiBase || baseLooksDefault) {
          settings.apiBase = defaults.apiBase;
          setPref("apiBase", settings.apiBase);
          if (apiBaseEl) {
            apiBaseEl.value = settings.apiBase;
            apiBaseEl.setAttribute("value", settings.apiBase);
          }
        }
        if (!settings.apiModel || modelLooksDefault) {
          settings.apiModel = defaults.model;
          setPref("apiModel", settings.apiModel);
          if (apiModelEl) {
            apiModelEl.value = settings.apiModel;
            apiModelEl.setAttribute("value", settings.apiModel);
          }
        }
      }
      setPref(key, nextValue);
    };

    applyValue(settings[key] ?? "");

    const handler = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const nextValue = target?.value ?? "";
      commitValue(nextValue);
    };

    element.addEventListener("change", handler);
    element.addEventListener("command", handler);
  });

}
