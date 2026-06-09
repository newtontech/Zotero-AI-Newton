import { config } from "../package.json";

const localeMessages: Record<string, string> = {
  "workspace-error-cancelled": "Request cancelled",
  "workspace-error-missing-api-base": "API base URL is not configured",
  "workspace-error-missing-key": "API key is not configured",
  "workspace-error-provider-not-found": "Provider not found",
  "workspace-evidence-available": "PDF evidence available",
  "workspace-no-evidence": "No PDF evidence available",
  "pdf-no-fulltext":
    'PDF found for "{ $title }" but full-text not indexed in Zotero',
  "pdf-no-pdf": 'No PDF attachment found for "{ $title }"',
};

(globalThis as any).addon ??= {
  data: {
    locale: {
      current: {
        formatMessagesSync(messages: Array<{ id: string }>) {
          return messages.map(({ id }) => {
            const key = id.replace(`${config.addonRef}-`, "");
            return { value: localeMessages[key] ?? id, attributes: [] };
          });
        },
      },
    },
  },
};

(globalThis as any).Zotero ??= {};
(globalThis as any).Zotero[config.addonInstance] ??= {
  data: { initialized: true },
};
(globalThis as any).Zotero.debug ??= () => {};
