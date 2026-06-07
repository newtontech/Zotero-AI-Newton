import { getPref } from "../utils/prefs";

export type ProviderName = "openai" | "deepseek" | "custom";

export type AISettingKey =
  | "provider"
  | "apiBase"
  | "apiKey"
  | "apiModel"
  | "conversationMode"
  | "agentTone";

export type AISettings = Record<AISettingKey, string>;

export interface ProviderChoice {
  name: ProviderName;
  key: string;
  model: string;
  apiBase: string;
}

export interface ProviderDefaults {
  apiBase: string;
  model: string;
}

export const PROVIDER_DEFAULTS: Record<ProviderName, ProviderDefaults> = {
  openai: {
    apiBase: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  deepseek: {
    apiBase: "https://api.deepseek.com",
    model: "deepseek-chat",
  },
  custom: {
    apiBase: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
};

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: "openai",
  apiBase: PROVIDER_DEFAULTS.openai.apiBase,
  apiKey: "",
  apiModel: PROVIDER_DEFAULTS.openai.model,
  conversationMode: "auto",
  agentTone: "concise",
};

export function normalizeProviderName(value: unknown): ProviderName {
  if (value === "deepseek" || value === "custom") return value;
  return "openai";
}

export function getProviderDefaults(value: unknown): ProviderDefaults {
  return PROVIDER_DEFAULTS[normalizeProviderName(value)];
}

function prefString(key: string): string {
  return String(getPref(key) || "").trim();
}

export function resolveProviderFromPrefs(): ProviderChoice {
  const name = normalizeProviderName(prefString("provider"));
  const defaults = getProviderDefaults(name);

  let apiKey = prefString("apiKey");
  let apiBase = prefString("apiBase") || defaults.apiBase;
  let apiModel = prefString("apiModel") || defaults.model;
  let resolvedName = name;

  const legacyOpenAIKey = prefString("openaiKey");
  const legacyOpenAIModel = prefString("openaiModel");
  const legacyDeepSeekKey = prefString("deepseekKey");
  const legacyDeepSeekModel = prefString("deepseekModel");

  if (!apiKey && legacyOpenAIKey) {
    apiKey = legacyOpenAIKey;
    apiBase = PROVIDER_DEFAULTS.openai.apiBase;
    apiModel = legacyOpenAIModel || PROVIDER_DEFAULTS.openai.model;
    resolvedName = "openai";
  } else if (!apiKey && legacyDeepSeekKey) {
    apiKey = legacyDeepSeekKey;
    apiBase = PROVIDER_DEFAULTS.deepseek.apiBase;
    apiModel = legacyDeepSeekModel || PROVIDER_DEFAULTS.deepseek.model;
    resolvedName = "deepseek";
  }

  return {
    name: resolvedName,
    key: apiKey,
    model: apiModel,
    apiBase: apiBase.replace(/\/+$/, ""),
  };
}
