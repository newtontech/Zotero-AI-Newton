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

The evaluation baseline lives in `test/fixtures/ai-analysis-benchmark.json` and
`src/modules/aiEvaluation.ts`. The scoring helpers track:

- **required-fact coverage** for summaries (substring-based)
- **keyword F1** for keyword extraction (set-based precision/recall)
- **ROUGE-L** for summary quality (LCS-based, beta=1.2)
- **related-literature relevance** for recommendation quality

The `runBenchmark()` runner aggregates per-case metrics into a report, and
`formatReportMarkdown()` produces a human-readable summary table.

The fixture set covers 16 papers spanning catalysis, batteries, MOFs, protein
folding, gene editing, and AI-guided synthesis. This is a scaffold toward the
stated 50-paper benchmark for issue #15; full coverage requires domain-expert
curation of ground-truth summaries and keywords.

## Automation Tools (NEW)

### Fixture Validation

- **Script**: `scripts/validate-fixtures.ts`
- **Usage**: `npm run validate-fixtures`
- **Purpose**: Validates fixture format, completeness, and consistency
- **Features**: Checks required fields, data types, and provides progress tracking

### Benchmark Statistics

- **Script**: `scripts/benchmark-stats.ts`
- **Usage**: `npm run benchmark-stats`
- **Purpose**: Provides detailed statistics about current benchmark coverage
- **Features**: Domain analysis, progress tracking, coverage gaps identification

### Contribution Guide

- **Document**: `test/fixtures/CONTRIBUTING.md`
- **Purpose**: Step-by-step guide for domain experts to contribute real papers
- **Content**: Format specifications, quality guidelines, examples, review process

These automation tools make it easier for domain experts to contribute source-backed
papers without needing to understand the full codebase.
