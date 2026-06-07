export interface AIAnalysisBenchmarkCase {
  id: string;
  title: string;
  expectedFacts: string[];
  expectedKeywords: string[];
  candidateSummary: string;
  candidateKeywords: string[];
}

export interface AIAnalysisEvaluation {
  id: string;
  factCoverage: number;
  keywordF1: number;
  passed: boolean;
}

function normalizeTerm(value: string): string {
  return value.trim().toLowerCase();
}

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

export function evaluateAnalysisCase(
  benchmark: AIAnalysisBenchmarkCase,
  thresholds = { factCoverage: 0.8, keywordF1: 0.7 },
): AIAnalysisEvaluation {
  const factCoverage = scoreFactCoverage(
    benchmark.candidateSummary,
    benchmark.expectedFacts,
  );
  const keywordF1 = scoreKeywordF1(
    benchmark.candidateKeywords,
    benchmark.expectedKeywords,
  );
  return {
    id: benchmark.id,
    factCoverage,
    keywordF1,
    passed:
      factCoverage >= thresholds.factCoverage &&
      keywordF1 >= thresholds.keywordF1,
  };
}
