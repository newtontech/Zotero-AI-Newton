# Security Policy

## Overview

Zotero AI Newton takes security seriously. This document outlines security features, best practices, and how to report vulnerabilities.

## Security Features

### 1. Prompt Injection Protection

The plugin implements prompt injection boundaries to prevent untrusted content (from PDFs, annotations, notes) from overriding system instructions.

**Implementation:**

- User content is wrapped in `### USER CONTENT START ###` and `### USER CONTENT END ###` delimiters
- The system prompt explicitly instructs the LLM to treat content within delimiters as data only
- User input is sanitized to remove common injection patterns (e.g., "ignore previous instructions")

**Files:**

- `src/modules/llmClient.ts` - `sanitizeUserInput()` function
- `addon/locale/en-US/addon.ftl` - System prompt with security instructions

### 2. API Key Redaction

API keys are never exposed in logs, error messages, or UI output.

**Implementation:**

- `src/utils/security.ts` provides `redactApiKey()` and `redactSensitiveData()` functions
- All error messages are automatically redacted before being shown to users
- API key input field uses `type="password"` in the preferences UI

**Best Practices for Contributors:**

- Always use `redactApiKey()` when logging or returning error messages
- Use `safeLog()` instead of `console.log()` or `Zotero.debug()` for sensitive data
- Never commit code that logs API keys or other credentials

### 3. Request/Response Size Limits

To prevent abuse and denial-of-service attacks:

- Maximum request size: 100KB
- Maximum response size: 1MB
- Maximum input length: 50,000 characters

**Files:**

- `src/modules/llmClient.ts` - `postJSON()` function

### 4. API Base URL Validation

Custom API endpoints are validated to prevent SSRF (Server-Side Request Forgery) attacks.

**Implementation:**

- Only HTTPS URLs are allowed
- Private IP ranges (localhost, 192.168.x.x, 10.x.x.x, 172.x.x.x) are blocked
- URL validation in `src/utils/security.ts` - `isAllowedApiUrl()` function

### 5. Agent Runtime Limits

When using agent/tool mode, the following limits apply:

- Maximum agent steps: 10 (configurable via `maxAgentSteps` preference)
- Maximum agent time: 300 seconds / 5 minutes (configurable via `maxAgentTime`)
- Maximum tokens per request: 4096 (configurable via `maxTokensPerRequest`)
- Maximum cost per session: $1.00 USD (configurable via `maxCostPerSession`)

**Files:**

- `src/modules/aiConfig.ts` - `getAgentRuntimeLimits()` function

### 6. Write Action Confirmation

All write actions (creating notes, modifying tags, deleting items) require explicit user confirmation before execution.

**Implementation:**

- `src/modules/writeConfirmation.ts` provides confirmation infrastructure
- Write actions are defined as types: `create_note`, `delete_note`, `modify_tags`, etc.
- Confirmation dialog is shown before each write action

**Note:** Full UI dialog implementation is pending agent runtime addition.

## Security Configuration

### Preferences

Users can configure security-related settings in the Add-on Preferences:

| Setting               | Default | Description                                |
| --------------------- | ------- | ------------------------------------------ |
| `maxAgentSteps`       | 10      | Maximum number of agent steps per session  |
| `maxAgentTime`        | 300     | Maximum time (seconds) for agent execution |
| `maxTokensPerRequest` | 4096    | Maximum tokens per LLM request             |
| `maxCostPerSession`   | 1.0     | Maximum cost (USD) per session             |

### API Base URL Allowlist

By default, the following API hosts are allowed:

- `api.openai.com`
- `api.deepseek.com`
- `generativelanguage.googleapis.com`
- `api.anthropic.com`

Custom URLs are allowed but validated for security (HTTPS only, no private IPs).

## Reporting Vulnerabilities

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them responsibly by emailing: [SECURITY_CONTACT_EMAIL]

**What to include:**

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We aim to respond to security reports within 48 hours.

## Security Best Practices for Users

1. **Protect your API keys:**
   - Never share your API keys
   - Use the password field in preferences (keys are masked)
   - Rotate your keys regularly

2. **Review write actions:**
   - Always review what the AI is about to modify
   - Only confirm actions you understand and trust

3. **Use trusted content sources:**
   - The plugin processes PDFs and metadata from your Zotero library
   - Be cautious with PDFs from untrusted sources

4. **Keep the plugin updated:**
   - Install updates promptly to get security fixes
   - Watch the GitHub repository for security advisories

## Security Best Practices for Contributors

1. **Never commit secrets:**
   - Use `.gitignore` for config files with credentials
   - Use environment variables for development keys

2. **Always redact sensitive data:**
   - Use `redactApiKey()` and `redactSensitiveData()` from `src/utils/security.ts`
   - Test that your error messages don't leak keys

3. **Validate all inputs:**
   - Sanitize user input and PDF content
   - Validate URLs, file paths, and other external data

4. **Follow the principle of least privilege:**
   - Only request necessary permissions
   - Minimize data access and retention

5. **Add tests for security features:**
   - Write regression tests for prompt injection prevention
   - Test API key redaction
   - Test input sanitization

## Known Security Limitations

1. **Write action confirmation UI:** Currently a placeholder (auto-confirms). Full UI dialog needed when agent runtime is added.

2. **PDF content extraction:** Malicious PDFs could potentially cause issues during text extraction. Ensure you have the latest PDF.js or extraction library.

3. **Rate limiting:** No client-side rate limiting implemented yet. Users should configure limits on their API provider side.

## Security-Related Tests

Run security tests:

```bash
npm test -- test/security.test.ts
```

**Test coverage:**

- API key redaction
- Prompt injection prevention
- URL validation
- Input sanitization

## Contact

For security questions or to report vulnerabilities: [SECURITY_CONTACT_EMAIL]

For general issues: https://github.com/newtontech/Zotero-AI-Newton/issues
