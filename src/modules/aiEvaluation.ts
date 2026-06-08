export interface AIAnalysisBenchmarkCase {
  id: string;
  title: string;
  expectedFacts: string[];
  expectedKeywords: string[];
  candidateSummary: string;
  candidateKeywords: string[];
  /** Titles/abstracts of related papers the candidate recommended. */
  candidateRelated?: string[];
  /** Titles/abstracts of ground-truth related papers. */
  expectedRelated?: string[];
  /** DOI for source-backed fixtures. */
  doi?: string;
  /** arXiv ID for preprint fixtures. */
  arxivId?: string;
  /** Publication year. */
  year?: number;
  /** Authors list. */
  authors?: string[];
  /** Publication venue. */
  venue?: string;
}

export interface AIAnalysisEvaluation {
  id: string;
  factCoverage: number;
  keywordPrecision: number;
  keywordRecall: number;
  keywordF1: number;
  rougeL: number;
  rougeLPrecision: number;
  rougeLRecall: number;
  relatedRelevance: number;
  relatedPrecision: number;
  relatedRecall: number;
  passed: boolean;
}

export interface LLMProviderResult {
  provider: string;
  model: string;
  evaluation: AIAnalysisEvaluation;
}

export interface LLMProviderComparison {
  caseId: string;
  results: LLMProviderResult[];
  bestProvider: string;
  metricComparisons: {
    factCoverage: { [provider: string]: number };
    keywordF1: { [provider: string]: number };
    rougeL: { [provider: string]: number };
    relatedRelevance: { [provider: string]: number };
  };
}

export interface BenchmarkReport {
  runDate: string;
  totalCases: number;
  avgFactCoverage: number;
  avgKeywordF1: number;
  avgKeywordPrecision: number;
  avgKeywordRecall: number;
  avgRougeL: number;
  avgRelatedRelevance: number;
  avgRelatedPrecision: number;
  avgRelatedRecall: number;
  passRate: number;
  perCase: AIAnalysisEvaluation[];
  /** Optional LLM provider comparison results. */
  providerComparisons?: LLMProviderComparison[];
}

// ---------------------------------------------------------------------------
// Term normalization (shared)
// ---------------------------------------------------------------------------

function normalizeTerm(value: string): string {
  return value.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Fact coverage (substring-based, from PR #18)
// ---------------------------------------------------------------------------

export function scoreFactCoverage(
  candidateSummary: string,
  expectedFacts: string[],
): number {
  if (!expectedFacts.length) return 1;
  const normalizedSummary = normalizeTerm(candidateSummary);
  const matched = expectedFacts.filter((fact) =>
    normalizedSummary.includes(normalizeTerm(fact)),
  );
  return matched.length / expectedFacts.length;
}

// ---------------------------------------------------------------------------
// Keyword F1 (set-based, from PR #18)
// Returns { precision, recall, f1 }
// ---------------------------------------------------------------------------

export function scoreKeywordF1(
  candidateKeywords: string[],
  expectedKeywords: string[],
): { precision: number; recall: number; f1: number } {
  if (!candidateKeywords.length && !expectedKeywords.length) {
    return { precision: 1, recall: 1, f1: 1 };
  }
  if (!candidateKeywords.length || !expectedKeywords.length) {
    return { precision: 0, recall: 0, f1: 0 };
  }

  const predicted = new Set(candidateKeywords.map(normalizeTerm));
  const expected = new Set(expectedKeywords.map(normalizeTerm));
  const truePositive = [...predicted].filter((term) =>
    expected.has(term),
  ).length;
  if (!truePositive) return { precision: 0, recall: 0, f1: 0 };

  const precision = truePositive / predicted.size;
  const recall = truePositive / expected.size;
  const f1 = (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1 };
}

// ---------------------------------------------------------------------------
// ROUGE-L (LCS-based)
// ---------------------------------------------------------------------------

function lcsLength(reference: string[], candidate: string[]): number {
  const m = reference.length;
  const n = candidate.length;
  // Build DP table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (reference[i - 1] === candidate[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[m][n];
}

export function scoreRougeL(candidate: string, reference: string): number {
  const refTokens = normalizeTerm(reference).split(/\s+/).filter(Boolean);
  const candTokens = normalizeTerm(candidate).split(/\s+/).filter(Boolean);
  if (!refTokens.length && !candTokens.length) return 1;
  if (!refTokens.length || !candTokens.length) return 0;

  const lcs = lcsLength(refTokens, candTokens);
  const precision = lcs / candTokens.length;
  const recall = lcs / refTokens.length;
  const beta = 1.2; // ROUGE-L default favors recall slightly
  if (precision + recall === 0) return 0;
  return (
    ((1 + beta * beta) * precision * recall) /
    (recall + beta * beta * precision)
  );
}

// ---------------------------------------------------------------------------
// Related-literature relevance
// Returns { precision, recall, score }
// ---------------------------------------------------------------------------

export function scoreRelatedRelevance(
  candidateRelated: string[],
  expectedRelated: string[],
): { precision: number; recall: number; score: number } {
  if (!expectedRelated.length) {
    return { precision: 1, recall: 1, score: 1 };
  }
  if (!candidateRelated.length) {
    return { precision: 0, recall: 0, score: 0 };
  }

  const expected = expectedRelated.map((t) => normalizeTerm(t));
  const matched = candidateRelated.filter((cand) => {
    const nc = normalizeTerm(cand);
    return expected.some((exp) => nc.includes(exp) || exp.includes(nc));
  });

  const precision = matched.length / candidateRelated.length;
  const recall = matched.length / expectedRelated.length;
  const score = matched.length / expectedRelated.length;
  return { precision, recall, score };
}

// ---------------------------------------------------------------------------
// Full case evaluation
// ---------------------------------------------------------------------------

export function evaluateAnalysisCase(
  benchmark: AIAnalysisBenchmarkCase,
  thresholds = {
    factCoverage: 0.8,
    keywordF1: 0.7,
    rougeL: 0.5,
    relatedRelevance: 0.8,
  },
): AIAnalysisEvaluation {
  const factCoverage = scoreFactCoverage(
    benchmark.candidateSummary,
    benchmark.expectedFacts,
  );

  const keywordMetrics = scoreKeywordF1(
    benchmark.candidateKeywords,
    benchmark.expectedKeywords,
  );

  const rougeL = scoreRougeL(
    benchmark.candidateSummary,
    benchmark.expectedFacts.join(". "),
  );

  // Calculate ROUGE-L precision and recall
  const refTokens = normalizeTerm(benchmark.expectedFacts.join(". "))
    .split(/\s+/)
    .filter(Boolean);
  const candTokens = normalizeTerm(benchmark.candidateSummary)
    .split(/\s+/)
    .filter(Boolean);
  const lcs =
    refTokens.length && candTokens.length
      ? lcsLength(refTokens, candTokens)
      : 0;
  const rougeLPrecision = candTokens.length ? lcs / candTokens.length : 1;
  const rougeLRecall = refTokens.length ? lcs / refTokens.length : 1;

  const relatedMetrics = scoreRelatedRelevance(
    benchmark.candidateRelated ?? [],
    benchmark.expectedRelated ?? [],
  );

  return {
    id: benchmark.id,
    factCoverage,
    keywordPrecision: keywordMetrics.precision,
    keywordRecall: keywordMetrics.recall,
    keywordF1: keywordMetrics.f1,
    rougeL,
    rougeLPrecision,
    rougeLRecall,
    relatedRelevance: relatedMetrics.score,
    relatedPrecision: relatedMetrics.precision,
    relatedRecall: relatedMetrics.recall,
    passed:
      factCoverage >= thresholds.factCoverage &&
      keywordMetrics.f1 >= thresholds.keywordF1 &&
      rougeL >= thresholds.rougeL &&
      relatedMetrics.score >= thresholds.relatedRelevance,
  };
}

// ---------------------------------------------------------------------------
// Benchmark runner (aggregates across all cases)
// ---------------------------------------------------------------------------

export function runBenchmark(
  cases: AIAnalysisBenchmarkCase[],
  thresholds = {
    factCoverage: 0.8,
    keywordF1: 0.7,
    rougeL: 0.5,
    relatedRelevance: 0.8,
  },
): BenchmarkReport {
  const perCase = cases.map((c) => evaluateAnalysisCase(c, thresholds));
  const total = perCase.length || 1;
  return {
    runDate: new Date().toISOString(),
    totalCases: cases.length,
    avgFactCoverage: perCase.reduce((s, e) => s + e.factCoverage, 0) / total,
    avgKeywordF1: perCase.reduce((s, e) => s + e.keywordF1, 0) / total,
    avgKeywordPrecision:
      perCase.reduce((s, e) => s + e.keywordPrecision, 0) / total,
    avgKeywordRecall: perCase.reduce((s, e) => s + e.keywordRecall, 0) / total,
    avgRougeL: perCase.reduce((s, e) => s + e.rougeL, 0) / total,
    avgRelatedRelevance:
      perCase.reduce((s, e) => s + e.relatedRelevance, 0) / total,
    avgRelatedPrecision:
      perCase.reduce((s, e) => s + e.relatedPrecision, 0) / total,
    avgRelatedRecall: perCase.reduce((s, e) => s + e.relatedRecall, 0) / total,
    passRate: perCase.filter((e) => e.passed).length / total,
    perCase,
  };
}

// ---------------------------------------------------------------------------
// Report formatter (Markdown)
// ---------------------------------------------------------------------------

export function formatReportMarkdown(report: BenchmarkReport): string {
  const lines: string[] = [
    "# AI Analysis Benchmark Report",
    "",
    `**Run date:** ${report.runDate}`,
    `**Total cases:** ${report.totalCases}`,
    "",
    "## Aggregate Metrics",
    "",
    "| Metric | Average | Target |",
    "|--------|---------|--------|",
    `| Fact Coverage | ${report.avgFactCoverage.toFixed(3)} | 0.80 |`,
    `| Keyword F1 | ${report.avgKeywordF1.toFixed(3)} | 0.70 |`,
    `| Keyword Precision | ${report.avgKeywordPrecision.toFixed(3)} | - |`,
    `| Keyword Recall | ${report.avgKeywordRecall.toFixed(3)} | - |`,
    `| ROUGE-L | ${report.avgRougeL.toFixed(3)} | 0.50 |`,
    `| Related Relevance | ${report.avgRelatedRelevance.toFixed(3)} | 0.80 |`,
    `| Related Precision | ${report.avgRelatedPrecision.toFixed(3)} | - |`,
    `| Related Recall | ${report.avgRelatedRecall.toFixed(3)} | - |`,
    `| Pass Rate | ${(report.passRate * 100).toFixed(1)}% | 100% |`,
    "",
    "## Per-Case Results",
    "",
    "| ID | Fact Cov. | KW F1 | KW P/R | ROUGE-L | Related | Passed |",
    "|----|-----------|--------|---------|---------|---------|--------|",
    ...report.perCase.map(
      (e) =>
        `| ${e.id} | ${e.factCoverage.toFixed(2)} | ${e.keywordF1.toFixed(2)} | ${e.keywordPrecision.toFixed(2)}/${e.keywordRecall.toFixed(2)} | ${e.rougeL.toFixed(2)} | ${e.relatedRelevance.toFixed(2)} | ${e.passed ? "Yes" : "No"} |`,
    ),
    "",
  ];

  // Add LLM provider comparison section if available
  if (report.providerComparisons && report.providerComparisons.length > 0) {
    lines.push("## LLM Provider Comparison", "");
    lines.push(
      "| Case ID | Metric | " +
        report.providerComparisons[0].results
          .map((r) => r.provider)
          .join(" | ") +
        " | Best |",
    );
    lines.push(
      "|---------|--------|" +
        report.providerComparisons[0].results.map(() => "--------").join("|") +
        "|--------|",
    );

    const metrics = [
      "factCoverage",
      "keywordF1",
      "rougeL",
      "relatedRelevance",
    ] as const;
    const metricLabels = [
      "Fact Coverage",
      "Keyword F1",
      "ROUGE-L",
      "Related Relevance",
    ];

    metrics.forEach((metric, idx) => {
      const row = [
        `| ${report.providerComparisons![0].caseId} | ${metricLabels[idx]} |`,
      ];
      report.providerComparisons!.forEach((comp) => {
        const values = comp.results.map((r) => {
          const val = r.evaluation[metric];
          return typeof val === "number" ? val.toFixed(3) : "N/A";
        });
        row.push(values.join(" | ") + " |");
      });
      lines.push(row.join(""));
    });
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// LLM Provider Comparison
// ---------------------------------------------------------------------------

/**
 * Compare multiple LLM providers on the same benchmark case.
 * Each provider result should have the candidate outputs (summary, keywords, related).
 */
export function compareProviders(
  benchmark: AIAnalysisBenchmarkCase,
  providerResults: Array<{
    provider: string;
    model: string;
    candidateSummary: string;
    candidateKeywords: string[];
    candidateRelated?: string[];
  }>,
  thresholds = {
    factCoverage: 0.8,
    keywordF1: 0.7,
    rougeL: 0.5,
    relatedRelevance: 0.8,
  },
): LLMProviderComparison {
  const results: LLMProviderResult[] = providerResults.map((pr) => {
    const evaluation = evaluateAnalysisCase(
      {
        ...benchmark,
        candidateSummary: pr.candidateSummary,
        candidateKeywords: pr.candidateKeywords,
        candidateRelated: pr.candidateRelated,
      },
      thresholds,
    );
    return {
      provider: pr.provider,
      model: pr.model,
      evaluation,
    };
  });

  // Determine best provider for each metric
  const metricComparisons = {
    factCoverage: {} as { [provider: string]: number },
    keywordF1: {} as { [provider: string]: number },
    rougeL: {} as { [provider: string]: number },
    relatedRelevance: {} as { [provider: string]: number },
  };

  results.forEach((r) => {
    metricComparisons.factCoverage[r.provider] = r.evaluation.factCoverage;
    metricComparisons.keywordF1[r.provider] = r.evaluation.keywordF1;
    metricComparisons.rougeL[r.provider] = r.evaluation.rougeL;
    metricComparisons.relatedRelevance[r.provider] =
      r.evaluation.relatedRelevance;
  });

  // Simple best provider: highest average of all metrics
  let bestProvider = results[0].provider;
  let bestScore = -1;
  results.forEach((r) => {
    const avg =
      (r.evaluation.factCoverage +
        r.evaluation.keywordF1 +
        r.evaluation.rougeL +
        r.evaluation.relatedRelevance) /
      4;
    if (avg > bestScore) {
      bestScore = avg;
      bestProvider = r.provider;
    }
  });

  return {
    caseId: benchmark.id,
    results,
    bestProvider,
    metricComparisons,
  };
}

/**
 * Run provider comparison across multiple benchmark cases.
 */
export function runProviderComparison(
  cases: AIAnalysisBenchmarkCase[],
  providerResultsMap: Map<
    string,
    Array<{
      caseId: string;
      candidateSummary: string;
      candidateKeywords: string[];
      candidateRelated?: string[];
      model: string;
    }>
  >,
  thresholds = {
    factCoverage: 0.8,
    keywordF1: 0.7,
    rougeL: 0.5,
    relatedRelevance: 0.8,
  },
): LLMProviderComparison[] {
  return cases.map((benchmark) => {
    const providerResults = Array.from(providerResultsMap.entries()).map(
      ([provider, results]) => {
        const result = results.find((r) => r.caseId === benchmark.id);
        if (!result) {
          throw new Error(
            `No result found for provider ${provider}, case ${benchmark.id}`,
          );
        }
        return {
          provider,
          model: result.model,
          candidateSummary: result.candidateSummary,
          candidateKeywords: result.candidateKeywords,
          candidateRelated: result.candidateRelated,
        };
      },
    );
    return compareProviders(benchmark, providerResults, thresholds);
  });
}

/**
 * Format LLM provider comparison as a markdown string.
 */
export function formatProviderComparisonMarkdown(
  comparisons: LLMProviderComparison[],
): string {
  const lines: string[] = [
    "# LLM Provider Comparison Report",
    "",
    `**Run date:** ${new Date().toISOString()}`,
    `**Total cases:** ${comparisons.length}`,
    "",
  ];

  comparisons.forEach((comp) => {
    lines.push(`## Case: ${comp.caseId}`, "");
    lines.push(
      "| Provider | Model | Fact Cov. | KW F1 | ROUGE-L | Related | Passed |",
    );
    lines.push(
      "|----------|-------|-----------|-------|---------|---------|--------|",
    );
    comp.results.forEach((r) => {
      lines.push(
        `| ${r.provider} | ${r.model} | ${r.evaluation.factCoverage.toFixed(3)} | ${r.evaluation.keywordF1.toFixed(3)} | ${r.evaluation.rougeL.toFixed(3)} | ${r.evaluation.relatedRelevance.toFixed(3)} | ${r.evaluation.passed ? "Yes" : "No"} |`,
      );
    });
    lines.push("");
    lines.push(`**Best provider:** ${comp.bestProvider}`);
    lines.push("");
  });

  return lines.join("\n");
}
