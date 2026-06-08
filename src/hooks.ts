import { getString, initLocale } from "./utils/locale";
import { registerPrefsScripts } from "./modules/preferenceScript";
import { createZToolkit } from "./utils/ztoolkit";
import {
  ensureReaderSidebar,
  registerWorkspaceMenu,
  registerWorkspaceSection,
} from "./modules/aiWorkspace";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  initLocale();

  registerPreferencePane();

  registerWorkspaceSection();

  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );

  // Make sure reader sidebar tab exists whenever the reader deck changes
  // @ts-expect-error - addReaderTabPanelDeckObserver may not exist in newer toolkit
  void ztoolkit.Reader?.addReaderTabPanelDeckObserver?.(() => {
    const main = Zotero.getMainWindow();
    if (main?.document) ensureReaderSidebar(main.document);
  });

  // Mark initialized as true to confirm plugin loading status
  // outside of the plugin (e.g. scaffold testing process)
  addon.data.initialized = true;
}

async function onMainWindowLoad(win: _ZoteroTypes.MainWindow): Promise<void> {
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  win.MozXULElement.insertFTLIfNeeded(
    `${addon.data.config.addonRef}-mainWindow.ftl`,
  );

  injectWorkspaceStyles(win);

  ensureReaderSidebar(win.document);

  registerWorkspaceMenu();
}

async function onMainWindowUnload(win: Window): Promise<void> {
  ztoolkit.unregisterAll();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  // Remove addon object
  addon.data.alive = false;
  // @ts-expect-error - Plugin instance is not typed
  delete Zotero[addon.data.config.addonInstance];
}

async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  switch (type) {
    case "load":
      registerPrefsScripts(data.window);
      break;
    default:
      return;
  }
}

function registerPreferencePane() {
  Zotero.PreferencePanes.register({
    pluginID: addon.data.config.addonID,
    src: rootURI + "content/preferences.xhtml",
    label: getString("prefs-title"),
    image: `chrome://${addon.data.config.addonRef}/content/icons/favicon.svg`,
  });
}

function injectWorkspaceStyles(win: _ZoteroTypes.MainWindow) {
  const doc = win.document;
  if (!doc) return;
  const existing = doc.getElementById("zotero-ai-workspace-style");
  if (existing) return;
  const styles = doc.createElement("link");
  styles.id = "zotero-ai-workspace-style";
  styles.rel = "stylesheet";
  styles.type = "text/css";
  styles.href = `chrome://${addon.data.config.addonRef}/content/zoteroPane.css`;
  doc.documentElement?.appendChild(styles);
}

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onPrefsEvent,
};
