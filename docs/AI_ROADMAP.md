# AI Feature Roadmap

Zotero AI Newton keeps the first public beta focused on research workflows that
are already visible in the add-on: grounded chat, summary prompts, keyword
extraction, and related-reading direction finding.

## Priority

| Level | Capability                 | Status                                                           |
| ----- | -------------------------- | ---------------------------------------------------------------- |
| P0    | Literature summaries       | Implemented through the shared `SummaryAnalysis` prompt path     |
| P0    | Keyword extraction         | Implemented through the shared `KeywordAnalysis` prompt path     |
| P0    | Related reading directions | Implemented through the shared `RelatedWorkAnalysis` prompt path |
| P1    | Translation help           | Deferred until users ask for bilingual workflows                 |
| P1    | Citation analysis          | Deferred until bibliography metadata evaluation is available     |
| P2    | Figure analysis            | Deferred; requires image extraction and visual model evaluation  |
| P2    | Formula recognition        | Deferred; requires OCR/math parsing evaluation                   |
| P3    | Speech output              | Deferred; not required for the research MVP                      |
| P3    | Collaborative annotation   | Deferred; needs multi-user sync and permission design            |

## Configuration Boundary

The active setup surface stays intentionally small:

- provider
- API base
- API key
- model
- context scope
- answer tone

Legacy `openai*` and `deepseek*` preferences are read only for migration and are
no longer registered as new default preferences.

## Accuracy Evaluation

The lightweight baseline lives in `test/fixtures/ai-analysis-benchmark.json`.
The pure scoring helpers in `src/modules/aiEvaluation.ts` track:

- required-fact coverage for summaries
- keyword F1 for keyword extraction

This is not a substitute for a 50-paper benchmark. It is the first automated
contract that keeps future prompt changes measurable before a larger benchmark
is added.
