import { getPref } from "../utils/prefs";

export type ProviderName = "openai" | "deepseek" | "custom";

export type AISettingKey =
  | "provider"
  | "apiBase"
  | "apiKey"
  | "apiModel"
  | "conversationMode"
  | "agentTone"
  | "maxAgentSteps"
  | "maxAgentTime"
  | "maxTokensPerRequest"
  | "maxCostPerSession";

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
  maxAgentSteps: "10",
  maxAgentTime: "300", // 5 minutes in seconds
  maxTokensPerRequest: "4096",
  maxCostPerSession: "1.0", // $1.00 USD
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

export interface AgentRuntimeLimits {
  maxSteps: number;
  maxTimeSeconds: number;
  maxTokensPerRequest: number;
  maxCostPerSession: number;
}

export function getAgentRuntimeLimits(): AgentRuntimeLimits {
  const maxSteps = parseInt(getPref("maxAgentSteps") as string) || 10;
  const maxTimeSeconds = parseInt(getPref("maxAgentTime") as string) || 300;
  const maxTokens = parseInt(getPref("maxTokensPerRequest") as string) || 4096;
  const maxCost = parseFloat(getPref("maxCostPerSession") as string) || 1.0;

  return {
    maxSteps: Math.max(1, Math.min(100, maxSteps)), // Clamp between 1-100
    maxTimeSeconds: Math.max(30, Math.min(3600, maxTimeSeconds)), // Clamp between 30s-1hr
    maxTokensPerRequest: Math.max(256, Math.min(16384, maxTokens)), // Clamp between 256-16384
    maxCostPerSession: Math.max(0.01, Math.min(100, maxCost)), // Clamp between $0.01-$100
  };
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
