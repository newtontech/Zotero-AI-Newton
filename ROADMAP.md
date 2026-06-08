# Zotero AI Newton Roadmap

> **Meta Issue**: [#36](https://github.com/newtontech/Zotero-AI-Newton/issues/36) - Stabilize beta and evolve into a 2026 agentic research workspace

## Overview

This document tracks the implementation status of the three-phase roadmap to stabilize the Zotero AI Newton beta and evolve it into a reliable, evidence-grounded, agentic research workspace.

## Phase 1: Make the Beta Installable and Honest

**Goal**: Users can reliably install the beta and the product claims match actual capabilities.

| Issue                                                           | Priority | Description                                                                           | Status         | PR                                                            | Phase Complete |
| --------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------- | -------------- |
| [#25](https://github.com/newtontech/Zotero-AI-Newton/issues/25) | P0       | Fix XPI download and beta update feed                                                 | 🟡 In Progress | [#38](https://github.com/newtontech/Zotero-AI-Newton/pull/38) | ❌             |
| [#26](https://github.com/newtontech/Zotero-AI-Newton/issues/26) | P0       | Align GitHub Pages URL, promo site source, and download CTA                           | 🟡 In Progress | [#37](https://github.com/newtontech/Zotero-AI-Newton/pull/37) | ❌             |
| [#29](https://github.com/newtontech/Zotero-AI-Newton/issues/29) | P1       | Add release smoke tests for XPI artifact, manifest, update hash, and install path     | 🟡 In Progress | [#40](https://github.com/newtontech/Zotero-AI-Newton/pull/40) | ❌             |
| [#34](https://github.com/newtontech/Zotero-AI-Newton/issues/34) | P2       | Replace browser Babel demo with static build and clean unsupported credibility claims | ⚪ Pending     | -                                                             | ❌             |

**Phase 1 Progress**: 0/4 complete (0%)

## Phase 2: Make Research Answers Grounded

**Goal**: The add-on answers using real Zotero/PDF/annotation evidence with traceable citations.

| Issue                                                           | Priority | Description                                                              | Status         | PR                                                            | Phase Complete |
| --------------------------------------------------------------- | -------- | ------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------- | -------------- |
| [#27](https://github.com/newtontech/Zotero-AI-Newton/issues/27) | P0       | Implement real PDF text and annotation grounding before claiming PDF Q&A | 🟡 In Progress | [#39](https://github.com/newtontech/Zotero-AI-Newton/pull/39) | ❌             |
| [#28](https://github.com/newtontech/Zotero-AI-Newton/issues/28) | P1       | Add cited answers, evidence cards, and insufficient-evidence behavior    | 🟡 In Progress | [#43](https://github.com/newtontech/Zotero-AI-Newton/pull/43) | ❌             |
| [#33](https://github.com/newtontech/Zotero-AI-Newton/issues/33) | P2       | Extend benchmark with groundedness metrics and 50 source-backed cases    | ⚪ Pending     | -                                                             | ❌             |

**Phase 2 Progress**: 0/3 complete (0%)

## Phase 3: Modernize LLM and Agent Architecture

**Goal**: Provider abstraction, tool registry, security boundaries, and safe agent capabilities.

| Issue                                                           | Priority | Description                                                                                           | Status         | PR                                                            | Phase Complete |
| --------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------- | -------------- |
| [#35](https://github.com/newtontech/Zotero-AI-Newton/issues/35) | P1       | Add modern provider abstraction with streaming, cancellation, structured output, and agent-ready APIs | ⚪ Pending     | -                                                             | ❌             |
| [#30](https://github.com/newtontech/Zotero-AI-Newton/issues/30) | P1       | Introduce a typed Zotero tool registry for modern agent workflows                                     | 🟡 In Progress | [#41](https://github.com/newtontech/Zotero-AI-Newton/pull/41) | ❌             |
| [#31](https://github.com/newtontech/Zotero-AI-Newton/issues/31) | P1       | Add prompt-injection boundaries, API key redaction, and write-action confirmations                    | 🟡 In Progress | [#42](https://github.com/newtontech/Zotero-AI-Newton/pull/42) | ❌             |
| [#32](https://github.com/newtontech/Zotero-AI-Newton/issues/32) | P2       | Explore read-only MCP integration for selected Zotero context                                         | ⚪ Pending     | -                                                             | ❌             |

**Phase 3 Progress**: 0/4 complete (0%)

## Related Issues

| Issue                                                           | Priority | Description              | Status         | Notes                                                                                             |
| --------------------------------------------------------------- | -------- | ------------------------ | -------------- | ------------------------------------------------------------------------------------------------- |
| [#15](https://github.com/newtontech/Zotero-AI-Newton/issues/15) | -        | [科学] AI 分析准确性验证 | 🟡 In Progress | 16/50 papers (PRs #18, #19, #20 merged). Infrastructure ready, needs domain expert contributions. |

## Implementation Order

As defined in [#36](https://github.com/newtontech/Zotero-AI-Newton/issues/36):

1. **Release/download fixes first** - Users cannot reliably install the beta
2. **PDF evidence layer second** - Product claims depend on it
3. **Cited answer UI and groundedness evaluation third**
4. **Provider abstraction and tool registry fourth**
5. **MCP and write-capable agent actions last** - Behind explicit opt-in and confirmation

## Definition of Done for Roadmap

- [ ] A user can install the beta from the public website
- [ ] The add-on can answer using real Zotero/PDF/annotation evidence
- [ ] Answers display traceable citations or admit insufficient evidence
- [ ] CI verifies release artifacts and core evaluation metrics
- [ ] Agent behavior is bounded, permissioned, and safe by default

## CI Status

| Workflow               | Status                                                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI (Lint, Build, Test) | [![CI](https://github.com/newtontech/Zotero-AI-Newton/actions/workflows/ci.yml/badge.svg)](https://github.com/newtontech/Zotero-AI-Newton/actions/workflows/ci.yml)                |
| Release                | [![Release](https://github.com/newtontech/Zotero-AI-Newton/actions/workflows/release.yml/badge.svg)](https://github.com/newtontech/Zotero-AI-Newton/actions/workflows/release.yml) |
| GitHub Pages Deploy    | [![Pages](https://github.com/newtontech/Zotero-AI-Newton/actions/workflows/static.yml/badge.svg)](https://github.com/newtontech/Zotero-AI-Newton/actions/workflows/static.yml)     |

## Progress Summary

- **Total Issues**: 12 (11 from #36 + #15)
- **Issues with Open PRs**: 7
- **Issues without PRs**: 4 (#32, #33, #34, #35)
- **Merged PRs**: 3 (related to #15: #18, #19, #20)
- **Overall Progress**: 0% complete (0/11 issues closed)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and [docs/AI_ROADMAP.md](docs/AI_ROADMAP.md) for AI feature priorities.

---

**Last Updated**: 2026-06-09  
**Maintainer**: [@newtontech](https://github.com/newtontech)
