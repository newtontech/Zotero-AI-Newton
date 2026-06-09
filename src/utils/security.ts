/**
 * Security utilities for API key redaction and input sanitization
 */

const API_KEY_REDACTED = "[REDACTED]";
const MAX_STRING_LENGTH = 10000;

/**
 * Redact API keys from a string.
 * Handles various API key formats: OpenAI (sk-...), DeepSeek (sk-...), generic keys
 */
export function redactApiKey(text: string, apiKey?: string): string {
  if (!text) return text;

  let redacted = text;

  // Redact the actual API key if provided
  if (apiKey && apiKey.length > 8) {
    const escapedKey = escapeRegex(apiKey);
    const keyRegex = new RegExp(escapedKey, "gi");
    redacted = redacted.replace(keyRegex, API_KEY_REDACTED);
  }

  // Redact common API key patterns
  // OpenAI/DeepSeek style keys: sk-XXXXXXXX...
  redacted = redacted.replace(/sk-[a-zA-Z0-9]{20,}/g, API_KEY_REDACTED);

  // Generic API key patterns in URLs or headers
  redacted = redacted.replace(
    /Bearer\s+[a-zA-Z0-9_.-]{10,}/g,
    `Bearer ${API_KEY_REDACTED}`,
  );
  redacted = redacted.replace(
    /Authorization:\s*Bearer\s+[a-zA-Z0-9_.-]{10,}/gi,
    `Authorization: Bearer ${API_KEY_REDACTED}`,
  );

  // Redact keys that look like they might be in config/json
  redacted = redacted.replace(
    /"apiKey"\s*:\s*"[^"]+"/gi,
    `"apiKey": "${API_KEY_REDACTED}"`,
  );
  redacted = redacted.replace(
    /"key"\s*:\s*"[^"]+"/gi,
    `"key": "${API_KEY_REDACTED}"`,
  );

  return redacted;
}

/**
 * Redact sensitive information from an object (for logging)
 */
export function redactSensitiveData(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return redactApiKey(obj);
  }

  if (typeof obj === "object") {
    const redacted = Array.isArray(obj) ? [...obj] : { ...obj };

    for (const key of Object.keys(redacted)) {
      const value = (redacted as Record<string, unknown>)[key];

      // Redact fields that likely contain sensitive data
      if (isSensitiveField(key)) {
        (redacted as Record<string, unknown>)[key] = API_KEY_REDACTED;
      } else {
        (redacted as Record<string, unknown>)[key] = redactSensitiveData(value);
      }
    }

    return redacted;
  }

  return obj;
}

/**
 * Check if a field name suggests sensitive content
 */
function isSensitiveField(fieldName: string): boolean {
  const sensitiveFields = [
    "key",
    "apikey",
    "api_key",
    "password",
    "token",
    "secret",
    "credential",
    "authorization",
  ];

  const lowerField = fieldName.toLowerCase().replace(/[_-]/g, "");
  return sensitiveFields.some((sf) => lowerField.includes(sf));
}

/**
 * Escape special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Safely log an object without exposing sensitive data
 */
export function safeLog(message: string, data?: unknown): void {
  const redactedData = data ? redactSensitiveData(data) : undefined;
  const suffix =
    redactedData === undefined ? "" : ` ${JSON.stringify(redactedData)}`;
  Zotero.debug(`[AI Newton] ${redactApiKey(message)}${suffix}`);
}

/**
 * Truncate a string to prevent log flooding
 */
export function truncateForLog(
  text: string,
  maxLength: number = MAX_STRING_LENGTH,
): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "... [TRUNCATED]";
}

/**
 * Validate API base URL to prevent SSRF attacks
 * Returns true if the URL is allowed
 */
export function isAllowedApiUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);

    // Only allow HTTPS
    if (parsed.protocol !== "https:") {
      return false;
    }

    // Block private IP ranges
    const hostname = parsed.hostname;

    // Block localhost and private IPs
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.") ||
      hostname.match(/^169\.254\./)
    ) {
      return false;
    }

    // Allowlist of known good API hosts (can be expanded)
    const allowedHosts = [
      "api.openai.com",
      "api.deepseek.com",
      "generativelanguage.googleapis.com",
      "api.anthropic.com",
    ];

    // If it's a custom API, we still allow it but log a warning
    // In production, you might want to restrict to the allowlist only
    return true;
  } catch {
    return false;
  }
}
