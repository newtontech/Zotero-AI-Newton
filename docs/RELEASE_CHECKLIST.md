# Release Checklist

Use this checklist for every beta or stable XPI.

## Preflight

- `npm install` completes from a clean checkout.
- `npm run lint:check` passes.
- `npm run build` produces a versioned XPI.
- `npm run test` is run, or the release notes explain why it was skipped.

## Manual QA

- Install the XPI in a clean Zotero 7 profile.
- Save provider settings with an OpenAI-compatible endpoint.
- Chat with one selected item.
- Summarize or ask about a PDF attachment.
- Chat with a collection and confirm the context preview updates.
- Restart Zotero and verify settings persist.

## Release Notes

- State Zotero version tested.
- State operating systems tested.
- List provider/API compatibility.
- List known limitations.
- Link the XPI and update manifest.
