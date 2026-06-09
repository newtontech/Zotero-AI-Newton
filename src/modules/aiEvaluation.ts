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

  // --- Groundedness fields (issue #33) ---
  /** Expected citations in the answer (e.g., author-year or [N] refs). */
  expectedCitations?: string[];
  /** Citations actually produced by the candidate answer. */
  candidateCitations?: string[];
  /** Evidence chunks from source PDFs/metadata the answer should be grounded in. */
  evidenceChunks?: string[];
  /** Discrete claims extracted from the candidate answer for groundedness checking. */
  claims?: string[];
  /**
   * Set to true when the correct answer is "insufficient evidence".
   * The candidate should refuse or explicitly state evidence is lacking.
   */
  insufficientEvidence?: boolean;
  /**
   * Whether this case evaluates metadata-only vs full PDF-text grounding.
   * - "metadata": only title/abstract/keywords available
   * - "pdf-text": full-text PDF chunks available
   */
  sourceType?: "metadata" | "pdf-text";
}

export interface AIAnalysisEvaluation {
  id: string;
  factCoverage: number;
  keywordF1: number;
  rougeL: number;
  relatedRelevance: number;
  passed: boolean;

  // --- Groundedness metrics (issue #33) ---
  /** Citation precision: how many candidate citations are in expected set. */
  citationPrecision?: number;
  /** Citation recall: how many expected citations are present in candidate. */
  citationRecall?: number;
  /** Unsupported-claim rate: fraction of claims NOT supported by evidence. */
  unsupportedClaimRate?: number;
  /** Evidence coverage: fraction of evidence chunks that support at least one claim. */
  evidenceCoverage?: number;
  /**
   * Refusal quality (0-1): did the candidate correctly refuse when
   * `insufficientEvidence` is true, or correctly answer when false?
   */
  refusalQuality?: number;
  /** Source type for this evaluation case. */
  sourceType?: "metadata" | "pdf-text";
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

  // --- Groundedness aggregates (issue #33) ---
  avgCitationPrecision: number;
  avgCitationRecall: number;
  avgUnsupportedClaimRate: number;
  avgEvidenceCoverage: number;
  avgRefusalQuality: number;
  /** Breakdown of cases by source type. */
  metadataCases: number;
  pdfTextCases: number;
}

export interface PrecisionRecallScore {
  score: number;
  precision: number;
  recall: number;
}

export interface F1Score {
  f1: number;
  precision: number;
  recall: number;
}

export interface ProviderCandidate {
  provider: string;
  model: string;
  candidateSummary: string;
  candidateKeywords: string[];
  candidateRelated?: string[];
}

export interface ProviderComparisonResult {
  caseId: string;
  results: Array<{
    provider: string;
    model: string;
    evaluation: AIAnalysisEvaluation;
    averageScore: number;
  }>;
  bestProvider: string;
  metricComparisons: Record<string, Record<string, number>>;
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
): F1Score {
  if (!candidateKeywords.length && !expectedKeywords.length) {
    return { f1: 1, precision: 1, recall: 1 };
  }
  if (!candidateKeywords.length || !expectedKeywords.length) {
    return { f1: 0, precision: 0, recall: 0 };
  }

  const predicted = new Set(candidateKeywords.map(normalizeTerm));
  const expected = new Set(expectedKeywords.map(normalizeTerm));
  const truePositive = [...predicted].filter((term) =>
    expected.has(term),
  ).length;
  if (!truePositive) return { f1: 0, precision: 0, recall: 0 };

  const precision = truePositive / predicted.size;
  const recall = truePositive / expected.size;
  return {
    f1: (2 * precision * recall) / (precision + recall),
    precision,
    recall,
  };
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
): PrecisionRecallScore {
  if (!expectedRelated.length) {
    return { score: 1, precision: 1, recall: 1 };
  }
  if (!candidateRelated.length) {
    return { score: 0, precision: 0, recall: 0 };
  }

  const expected = expectedRelated.map((t) => normalizeTerm(t));
  const matched = candidateRelated.filter((cand) => {
    const nc = normalizeTerm(cand);
    return expected.some((exp) => nc.includes(exp) || exp.includes(nc));
  });
  const precision = matched.length / candidateRelated.length;
  const recall = matched.length / expected.length;
  return { score: recall, precision, recall };
}

// ---------------------------------------------------------------------------
// Groundedness metrics (issue #33)
// ---------------------------------------------------------------------------

/**
 * Citation precision: fraction of candidate citations that appear in the
 * expected-citation set.
 *
 * A citation is considered "matched" when the normalized candidate string
 * contains the normalized expected string or vice-versa (handles variations
 * like "Smith2023" vs "Smith et al., 2023").
 */
export function scoreCitationPrecision(
  candidateCitations: string[],
  expectedCitations: string[],
): number {
  if (!candidateCitations.length) return 1; // nothing to penalize
  if (!expectedCitations.length) return 0;

  const expected = expectedCitations.map(normalizeTerm);
  const matched = candidateCitations.filter((cand) => {
    const nc = normalizeTerm(cand);
    return expected.some((exp) => nc.includes(exp) || exp.includes(nc));
  });
  return matched.length / candidateCitations.length;
}

/**
 * Citation recall: fraction of expected citations that are present in the
 * candidate's citation list.
 */
export function scoreCitationRecall(
  candidateCitations: string[],
  expectedCitations: string[],
): number {
  if (!expectedCitations.length) return 1;
  if (!candidateCitations.length) return 0;

  const candidate = candidateCitations.map(normalizeTerm);
  const matched = expectedCitations.filter((exp) => {
    const ne = normalizeTerm(exp);
    return candidate.some((cand) => cand.includes(ne) || ne.includes(cand));
  });
  return matched.length / expectedCitations.length;
}

/**
 * Unsupported-claim rate: fraction of claims that are NOT supported by any
 * evidence chunk.
 *
 * A claim is "supported" when any evidence chunk contains the normalized
 * claim text (substring match).  This is intentionally permissive – the
 * evidence chunk may be a direct quote or a close paraphrase.
 *
 * Returns 0 when there are no claims (nothing unsupported).
 */
export function scoreUnsupportedClaimRate(
  claims: string[],
  evidenceChunks: string[],
): number {
  if (!claims.length) return 0;
  if (!evidenceChunks.length) return 1; // all claims unsupported

  const evidence = evidenceChunks.map(normalizeTerm);
  const unsupported = claims.filter((claim) => {
    const normalizedClaim = normalizeTerm(claim)
      .replace(/\bis supported\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return !evidence.some(
      (ev) =>
        ev.includes(normalizedClaim) ||
        normalizedClaim.includes(ev) ||
        normalizeTerm(claim).includes(ev),
    );
  });
  return unsupported.length / claims.length;
}

/**
 * Evidence coverage: fraction of evidence chunks that support at least one
 * claim.
 *
 * This measures whether the provided evidence is actually *used* in the
 * answer.  Low coverage may indicate the model ignored relevant sources.
 *
 * Returns 1 when there are no evidence chunks.
 */
export function scoreEvidenceCoverage(
  claims: string[],
  evidenceChunks: string[],
): number {
  if (!evidenceChunks.length) return 1;
  if (!claims.length) return 0;

  const normalizedClaims = claims.map(normalizeTerm);
  const covered = evidenceChunks.filter((ev) => {
    const ne = normalizeTerm(ev);
    return normalizedClaims.some((nc) => nc.includes(ne) || ne.includes(nc));
  });
  return covered.length / evidenceChunks.length;
}

/**
 * Refusal quality: did the candidate correctly handle insufficient-evidence
 * cases?
 *
 * - When `insufficientEvidence` is **true**: the candidate should refuse to
 *   answer or explicitly state that evidence is lacking.  We check for
 *   refusal keywords in the summary.
 * - When `insufficientEvidence` is **false**: the candidate should answer
 *   normally; refusal is penalized.
 *
 * Returns 1 for correct behavior, 0 otherwise.
 */
export function scoreRefusalQuality(
  candidateSummary: string,
  insufficientEvidence: boolean,
): number {
  const refusalKeywords = [
    "insufficient",
    "not enough",
    "cannot answer",
    "unable to",
    "lack of evidence",
    "evidence is lacking",
    "cannot determine",
    "not available",
  ];
  const normalized = normalizeTerm(candidateSummary);
  const didRefuse = refusalKeywords.some((kw) =>
    normalized.includes(normalizeTerm(kw)),
  );

  if (insufficientEvidence) {
    // Correct behaviour: the model refused
    return didRefuse ? 1 : 0;
  } else {
    // Correct behaviour: the model did NOT refuse
    return !didRefuse ? 1 : 0;
  }
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
    // Groundedness thresholds (issue #33)
    citationPrecision: 0.5,
    citationRecall: 0.5,
    unsupportedClaimRate: 0.3, // <= 30% claims may be unsupported
    evidenceCoverage: 0.5,
    refusalQuality: 0.8,
  },
): AIAnalysisEvaluation {
  const factCoverage = scoreFactCoverage(
    benchmark.candidateSummary,
    benchmark.expectedFacts,
  );
  const keywordScore = scoreKeywordF1(
    benchmark.candidateKeywords,
    benchmark.expectedKeywords,
  );
  const keywordF1 = keywordScore.f1;
  const rougeL = scoreRougeL(
    benchmark.candidateSummary,
    benchmark.expectedFacts.join(". "),
  );
  const relatedScore = scoreRelatedRelevance(
    benchmark.candidateRelated ?? [],
    benchmark.expectedRelated ?? [],
  );
  const relatedRelevance = relatedScore.score;

  // --- Groundedness metrics ---
  const citationPrecision = scoreCitationPrecision(
    benchmark.candidateCitations ?? [],
    benchmark.expectedCitations ?? [],
  );
  const citationRecall = scoreCitationRecall(
    benchmark.candidateCitations ?? [],
    benchmark.expectedCitations ?? [],
  );
  const unsupportedClaimRate = scoreUnsupportedClaimRate(
    benchmark.claims ?? [],
    benchmark.evidenceChunks ?? [],
  );
  const evidenceCoverage = scoreEvidenceCoverage(
    benchmark.claims ?? [],
    benchmark.evidenceChunks ?? [],
  );
  const refusalQuality = scoreRefusalQuality(
    benchmark.candidateSummary,
    benchmark.insufficientEvidence ?? false,
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
      relatedRelevance >= thresholds.relatedRelevance &&
      citationPrecision >= thresholds.citationPrecision &&
      citationRecall >= thresholds.citationRecall &&
      unsupportedClaimRate <= thresholds.unsupportedClaimRate &&
      evidenceCoverage >= thresholds.evidenceCoverage &&
      refusalQuality >= thresholds.refusalQuality,
    // Groundedness fields
    citationPrecision,
    citationRecall,
    unsupportedClaimRate,
    evidenceCoverage,
    refusalQuality,
    sourceType: benchmark.sourceType,
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
    citationPrecision: 0.5,
    citationRecall: 0.5,
    unsupportedClaimRate: 0.3,
    evidenceCoverage: 0.5,
    refusalQuality: 0.8,
  },
): BenchmarkReport {
  const perCase = cases.map((c) => evaluateAnalysisCase(c, thresholds));
  const total = perCase.length || 1;

  const metadataCases = perCase.filter(
    (e) => e.sourceType === "metadata",
  ).length;
  const pdfTextCases = perCase.filter(
    (e) => e.sourceType === "pdf-text",
  ).length;

  // Helpers to safely average optional groundedness fields
  const avg = (vals: (number | undefined)[]): number => {
    const defined = vals.filter((v): v is number => v !== undefined);
    if (!defined.length) return 0;
    return defined.reduce((s, v) => s + v, 0) / defined.length;
  };

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
    // Groundedness aggregates
    avgCitationPrecision: avg(perCase.map((e) => e.citationPrecision)),
    avgCitationRecall: avg(perCase.map((e) => e.citationRecall)),
    avgUnsupportedClaimRate: avg(perCase.map((e) => e.unsupportedClaimRate)),
    avgEvidenceCoverage: avg(perCase.map((e) => e.evidenceCoverage)),
    avgRefusalQuality: avg(perCase.map((e) => e.refusalQuality)),
    metadataCases,
    pdfTextCases,
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
    "",
    "### Groundedness Metrics",
    "",
    "| Metric | Average | Target |",
    "|--------|---------|--------|",
    `| Citation Precision | ${report.avgCitationPrecision.toFixed(3)} | 0.50 |`,
    `| Citation Recall | ${report.avgCitationRecall.toFixed(3)} | 0.50 |`,
    `| Unsupported-Claim Rate | ${report.avgUnsupportedClaimRate.toFixed(3)} | ≤0.30 |`,
    `| Evidence Coverage | ${report.avgEvidenceCoverage.toFixed(3)} | 0.50 |`,
    `| Refusal Quality | ${report.avgRefusalQuality.toFixed(3)} | 0.80 |`,
    "",
    "### Source-Type BreakDown",
    "",
    `| Source Type | Count |`,
    `|------------|-------|`,
    `| Metadata-only | ${report.metadataCases} |`,
    `| PDF-text | ${report.pdfTextCases} |`,
    "",
    `| Pass Rate | ${(report.passRate * 100).toFixed(1)}% | 100% |`,
    "",
    "## Per-Case Results",
    "",
    "| ID | Fact Cov. | Keyword F1 | ROUGE-L | Related | Cit. Prec. | Cit. Rec. | Unsup. | Evidence | Refusal | Type | Passed |",
    "|----|-----------|------------|---------|---------|------------|-----------|--------|----------|---------|------|--------|",
    ...report.perCase.map(
      (e) =>
        `| ${e.id} | ${e.factCoverage.toFixed(2)} | ${e.keywordF1.toFixed(2)} | ${e.rougeL.toFixed(2)} | ${e.relatedRelevance.toFixed(2)} | ${(e.citationPrecision ?? 0).toFixed(2)} | ${(e.citationRecall ?? 0).toFixed(2)} | ${(e.unsupportedClaimRate ?? 0).toFixed(2)} | ${(e.evidenceCoverage ?? 0).toFixed(2)} | ${(e.refusalQuality ?? 0).toFixed(2)} | ${e.sourceType ?? "n/a"} | ${e.passed ? "Yes" : "No"} |`,
    ),
    "",
    "---",
    "",
    "**Groundedness metrics explanation:**",
    "- **Citation Precision**: fraction of candidate citations that are correct.",
    "- **Citation Recall**: fraction of expected citations that were found.",
    "- **Unsupported-Claim Rate**: lower is better (≤0.30 target).",
    "- **Evidence Coverage**: fraction of evidence chunks actually used.",
    "- **Refusal Quality**: did the model correctly refuse when evidence was insufficient?",
    "",
  ];
  return lines.join("\n");
}

export function compareProviders(
  baseCase: AIAnalysisBenchmarkCase,
  candidates: ProviderCandidate[],
): ProviderComparisonResult {
  const results = candidates.map((candidate) => {
    const evaluation = evaluateAnalysisCase({
      ...baseCase,
      candidateSummary: candidate.candidateSummary,
      candidateKeywords: candidate.candidateKeywords,
      candidateRelated: candidate.candidateRelated ?? [],
    });
    const averageScore =
      (evaluation.factCoverage +
        evaluation.keywordF1 +
        evaluation.rougeL +
        evaluation.relatedRelevance) /
      4;

    return {
      provider: candidate.provider,
      model: candidate.model,
      evaluation,
      averageScore,
    };
  });

  const best = results.reduce((currentBest, candidate) =>
    candidate.averageScore > currentBest.averageScore ? candidate : currentBest,
  );

  return {
    caseId: baseCase.id,
    results,
    bestProvider: best.provider,
    metricComparisons: {
      factCoverage: Object.fromEntries(
        results.map((r) => [r.provider, r.evaluation.factCoverage]),
      ),
      keywordF1: Object.fromEntries(
        results.map((r) => [r.provider, r.evaluation.keywordF1]),
      ),
      rougeL: Object.fromEntries(
        results.map((r) => [r.provider, r.evaluation.rougeL]),
      ),
      relatedRelevance: Object.fromEntries(
        results.map((r) => [r.provider, r.evaluation.relatedRelevance]),
      ),
    },
  };
}

export function formatProviderComparisonMarkdown(
  comparisons: ProviderComparisonResult[],
): string {
  const lines = [
    "# LLM Provider Comparison Report",
    "",
    "| Case | Provider | Model | Avg. Score | Best |",
    "|------|----------|-------|------------|------|",
  ];

  for (const comparison of comparisons) {
    for (const result of comparison.results) {
      lines.push(
        `| ${comparison.caseId} | ${result.provider} | ${result.model} | ${result.averageScore.toFixed(3)} | ${result.provider === comparison.bestProvider ? "Yes" : "No"} |`,
      );
    }
  }

  return lines.join("\n");
}
