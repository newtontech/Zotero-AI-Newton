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
}

export interface AIAnalysisEvaluation {
  id: string;
  factCoverage: number;
  keywordF1: number;
  rougeL: number;
  relatedRelevance: number;
  passed: boolean;
}

export interface BenchmarkReport {
  runDate: string;
  totalCases: number;
  avgFactCoverage: number;
  avgKeywordF1: number;
  avgRougeL: number;
  avgRelatedRelevance: number;
  passRate: number;
  perCase: AIAnalysisEvaluation[];
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
// ---------------------------------------------------------------------------

export function scoreKeywordF1(
  candidateKeywords: string[],
  expectedKeywords: string[],
): number {
  if (!candidateKeywords.length && !expectedKeywords.length) return 1;
  if (!candidateKeywords.length || !expectedKeywords.length) return 0;

  const predicted = new Set(candidateKeywords.map(normalizeTerm));
  const expected = new Set(expectedKeywords.map(normalizeTerm));
  const truePositive = [...predicted].filter((term) =>
    expected.has(term),
  ).length;
  if (!truePositive) return 0;

  const precision = truePositive / predicted.size;
  const recall = truePositive / expected.size;
  return (2 * precision * recall) / (precision + recall);
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
// ---------------------------------------------------------------------------

export function scoreRelatedRelevance(
  candidateRelated: string[],
  expectedRelated: string[],
): number {
  if (!expectedRelated.length) return 1;
  if (!candidateRelated.length) return 0;

  const expected = expectedRelated.map((t) => normalizeTerm(t));
  const matched = candidateRelated.filter((cand) => {
    const nc = normalizeTerm(cand);
    return expected.some((exp) => nc.includes(exp) || exp.includes(nc));
  });
  return matched.length / expected.length;
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
  const keywordF1 = scoreKeywordF1(
    benchmark.candidateKeywords,
    benchmark.expectedKeywords,
  );
  const rougeL = scoreRougeL(
    benchmark.candidateSummary,
    benchmark.expectedFacts.join(". "),
  );
  const relatedRelevance = scoreRelatedRelevance(
    benchmark.candidateRelated ?? [],
    benchmark.expectedRelated ?? [],
  );
  return {
    id: benchmark.id,
    factCoverage,
    keywordF1,
    rougeL,
    relatedRelevance,
    passed:
      factCoverage >= thresholds.factCoverage &&
      keywordF1 >= thresholds.keywordF1 &&
      rougeL >= thresholds.rougeL &&
      relatedRelevance >= thresholds.relatedRelevance,
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
    avgRougeL: perCase.reduce((s, e) => s + e.rougeL, 0) / total,
    avgRelatedRelevance:
      perCase.reduce((s, e) => s + e.relatedRelevance, 0) / total,
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
    `| ROUGE-L | ${report.avgRougeL.toFixed(3)} | 0.50 |`,
    `| Related Relevance | ${report.avgRelatedRelevance.toFixed(3)} | 0.80 |`,
    `| Pass Rate | ${(report.passRate * 100).toFixed(1)}% | 100% |`,
    "",
    "## Per-Case Results",
    "",
    "| ID | Fact Cov. | Keyword F1 | ROUGE-L | Related | Passed |",
    "|----|-----------|------------|---------|---------|--------|",
    ...report.perCase.map(
      (e) =>
        `| ${e.id} | ${e.factCoverage.toFixed(2)} | ${e.keywordF1.toFixed(2)} | ${e.rougeL.toFixed(2)} | ${e.relatedRelevance.toFixed(2)} | ${e.passed ? "Yes" : "No"} |`,
    ),
    "",
  ];
  return lines.join("\n");
}
