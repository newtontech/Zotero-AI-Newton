import { assert } from "chai";
import {
  evaluateAnalysisCase,
  formatReportMarkdown,
  runBenchmark,
  scoreFactCoverage,
  scoreKeywordF1,
  scoreRelatedRelevance,
  scoreRougeL,
  scoreCitationPrecision,
  scoreCitationRecall,
  scoreUnsupportedClaimRate,
  scoreEvidenceCoverage,
  scoreRefusalQuality,
  compareProviders,
  formatProviderComparisonMarkdown,
  type AIAnalysisBenchmarkCase,
} from "../src/modules/aiEvaluation";

// Inline fixture subset for browser-bundled tests (avoids fs/path).
// The full 16-case fixture lives in test/fixtures/ai-analysis-benchmark.json.
const BENCHMARK_FIXTURES: AIAnalysisBenchmarkCase[] = [
  {
    id: "fixture-perovskite-review",
    title: "Perovskite review",
    expectedFacts: ["perovskite stability", "bandgap screening"],
    expectedKeywords: ["perovskite", "stability", "additives"],
    candidateSummary:
      "This perovskite stability review compares bandgap trends across additives.",
    candidateKeywords: ["perovskite", "stability", "additives"],
    candidateRelated: [
      "stability of halide perovskites",
      "bandgap engineering",
    ],
    expectedRelated: [
      "stability of halide perovskites",
      "bandgap engineering in solar cells",
    ],
  },
  {
    id: "fixture-dft-catalysis",
    title: "DFT study of transition-metal catalysis",
    expectedFacts: [
      "density functional theory",
      "activation energy barrier",
      "transition-metal catalyst",
    ],
    expectedKeywords: [
      "DFT",
      "catalysis",
      "activation energy",
      "transition metal",
    ],
    candidateSummary:
      "Density functional theory calculations reveal the activation energy barrier for the transition-metal catalyzed reaction pathway.",
    candidateKeywords: [
      "DFT",
      "catalysis",
      "activation energy",
      "transition metal",
    ],
    candidateRelated: [
      "computational catalysis design",
      "DFT reaction mechanisms",
    ],
    expectedRelated: [
      "computational catalysis design",
      "DFT reaction mechanisms",
    ],
  },
  {
    id: "fixture-mof-gas-storage",
    title: "MOF materials for gas storage",
    expectedFacts: [
      "metal-organic framework",
      "hydrogen storage capacity",
      "pore size distribution",
    ],
    expectedKeywords: ["MOF", "gas storage", "hydrogen", "porous materials"],
    candidateSummary:
      "The study evaluates metal-organic framework materials for hydrogen storage capacity through pore size optimization.",
    candidateKeywords: ["MOF", "gas storage", "hydrogen", "porous materials"],
    candidateRelated: [
      "porous framework materials",
      "hydrogen storage applications",
    ],
    expectedRelated: [
      "porous framework materials",
      "hydrogen storage applications",
    ],
  },
  {
    id: "fixture-protein-folding-ml",
    title: "Machine learning for protein folding",
    expectedFacts: [
      "neural network prediction",
      "protein structure",
      "folding accuracy",
    ],
    expectedKeywords: [
      "machine learning",
      "protein folding",
      "structure prediction",
      "neural network",
    ],
    candidateSummary:
      "Neural network prediction of protein structure achieves high folding accuracy through deep learning architecture.",
    candidateKeywords: [
      "machine learning",
      "protein folding",
      "structure prediction",
      "neural network",
    ],
    candidateRelated: ["deep learning for biology", "AlphaFold comparison"],
    expectedRelated: ["deep learning for biology", "AlphaFold comparison"],
  },
  {
    id: "fixture-crispr-gene-editing",
    title: "CRISPR-Cas9 gene editing efficiency",
    expectedFacts: [
      "CRISPR-Cas9 system",
      "off-target effects",
      "editing efficiency",
    ],
    expectedKeywords: ["CRISPR", "gene editing", "Cas9", "off-target"],
    candidateSummary:
      "The CRISPR-Cas9 system demonstrates high editing efficiency while minimizing off-target effects through improved guide RNA design.",
    candidateKeywords: ["CRISPR", "gene editing", "Cas9", "off-target"],
    candidateRelated: ["guide RNA optimization", "gene therapy applications"],
    expectedRelated: ["guide RNA optimization", "gene therapy applications"],
  },
  {
    id: "fixture-co2-reduction-electro",
    title: "Electrocatalytic CO2 reduction on copper",
    expectedFacts: [
      "CO2 reduction reaction",
      "copper catalyst",
      "product selectivity",
    ],
    expectedKeywords: [
      "CO2 reduction",
      "electrocatalysis",
      "copper",
      "selectivity",
    ],
    candidateSummary:
      "Electrocatalytic CO2 reduction on copper surfaces achieves tunable product selectivity through surface structure control.",
    candidateKeywords: [
      "CO2 reduction",
      "electrocatalysis",
      "copper",
      "selectivity",
    ],
    candidateRelated: [
      "carbon capture utilization",
      "electrochemical fuel synthesis",
    ],
    expectedRelated: [
      "carbon capture utilization",
      "electrochemical fuel synthesis",
    ],
  },
  {
    id: "fixture-ai-retrosynthesis",
    title: "AI-guided retrosynthetic planning",
    expectedFacts: [
      "neural network pathway prediction",
      "synthetic accessibility score",
      "reaction template library",
    ],
    expectedKeywords: [
      "retrosynthesis",
      "AI planning",
      "reaction prediction",
      "organic synthesis",
    ],
    candidateSummary:
      "Neural network pathway prediction combined with a reaction template library enables automated retrosynthetic planning with synthetic accessibility scoring.",
    candidateKeywords: [
      "retrosynthesis",
      "AI planning",
      "reaction prediction",
      "organic synthesis",
    ],
    candidateRelated: [
      "computer-aided synthesis",
      "chemical reaction databases",
    ],
    expectedRelated: [
      "computer-aided synthesis",
      "chemical reaction databases",
    ],
  },
  {
    id: "fixture-lithium-battery-solid",
    title: "Solid-state electrolytes for lithium batteries",
    expectedFacts: [
      "solid electrolyte",
      "ionic conductivity",
      "lithium-ion transport",
    ],
    expectedKeywords: [
      "solid-state battery",
      "electrolyte",
      "ionic conductivity",
      "lithium",
    ],
    candidateSummary:
      "Novel solid electrolyte design improves ionic conductivity for efficient lithium-ion transport in solid-state batteries.",
    candidateKeywords: [
      "solid-state battery",
      "electrolyte",
      "ionic conductivity",
      "lithium",
    ],
    candidateRelated: [
      "battery safety improvements",
      "solid electrolyte interface",
    ],
    expectedRelated: [
      "battery safety improvements",
      "solid electrolyte interface",
    ],
  },
  {
    id: "fixture-graphene-nanoribbon",
    title: "Graphene nanoribbon electronic properties",
    expectedFacts: [
      "graphene nanoribbons",
      "bandgap opening",
      "edge state effects",
    ],
    expectedKeywords: [
      "graphene",
      "nanoribbons",
      "bandgap",
      "quantum transport",
    ],
    candidateSummary:
      "Graphene nanoribbons exhibit controllable bandgap opening through edge state engineering for quantum transport applications.",
    candidateKeywords: [
      "graphene",
      "nanoribbons",
      "bandgap",
      "quantum transport",
    ],
    candidateRelated: ["2D material electronics", "nanoribbon fabrication"],
    expectedRelated: ["2D material electronics", "nanoribbon fabrication"],
  },
  {
    id: "fixture-nanoparticle-drug-delivery",
    title: "Nanoparticle-based targeted drug delivery",
    expectedFacts: [
      "targeted delivery mechanism",
      "nanoparticle surface functionalization",
      "drug release kinetics",
    ],
    expectedKeywords: [
      "nanoparticle",
      "drug delivery",
      "targeting",
      "surface functionalization",
    ],
    candidateSummary:
      "Targeted drug delivery using nanoparticle surface functionalization achieves controlled drug release kinetics at tumor sites.",
    candidateKeywords: [
      "nanoparticle",
      "drug delivery",
      "targeting",
      "surface functionalization",
    ],
    candidateRelated: ["cancer nanomedicine", "lipid nanoparticle carriers"],
    expectedRelated: ["cancer nanomedicine", "lipid nanoparticle carriers"],
  },
];

// ---------------------------------------------------------------------------
// Fact coverage (existing)
// ---------------------------------------------------------------------------

describe("AI analysis evaluation", function () {
  it("scores required fact coverage from a grounded summary", function () {
    const score = scoreFactCoverage(
      "The study reports perovskite stability and a bandgap screening workflow.",
      ["perovskite stability", "bandgap screening"],
    );

    assert.strictEqual(score, 1);
  });

  it("returns 0 when no facts match", function () {
    const score = scoreFactCoverage("The sky is blue.", ["catalysis", "DFT"]);
    assert.strictEqual(score, 0);
  });

  it("returns 1 for empty expected facts", function () {
    const score = scoreFactCoverage("any summary", []);
    assert.strictEqual(score, 1);
  });

  // ---------------------------------------------------------------------------
  // Keyword F1 (existing)
  // ---------------------------------------------------------------------------

  it("scores keyword extraction with F1", function () {
    const result = scoreKeywordF1(
      ["perovskite", "bandgap", "stability"],
      ["perovskite", "defects", "stability"],
    );

    assert.closeTo(result.f1, 0.67, 0.01);
    assert.closeTo(result.precision, 0.67, 0.01);
    assert.closeTo(result.recall, 0.67, 0.01);
  });

  it("returns 1 when both keyword sets are empty", function () {
    const result = scoreKeywordF1([], []);
    assert.strictEqual(result.f1, 1);
    assert.strictEqual(result.precision, 1);
    assert.strictEqual(result.recall, 1);
  });

  it("returns 0 when candidate has no keywords", function () {
    const result = scoreKeywordF1([], ["catalysis", "DFT"]);
    assert.strictEqual(result.f1, 0);
    assert.strictEqual(result.precision, 0);
    assert.strictEqual(result.recall, 0);
  });

  it("returns 0 when expected has no keywords", function () {
    const result = scoreKeywordF1(["catalysis"], []);
    assert.strictEqual(result.f1, 0);
    assert.strictEqual(result.precision, 0);
    assert.strictEqual(result.recall, 0);
  });

  it("returns 1 for identical keyword sets", function () {
    const result = scoreKeywordF1(["alpha", "beta"], ["alpha", "beta"]);
    assert.strictEqual(result.f1, 1);
    assert.strictEqual(result.precision, 1);
    assert.strictEqual(result.recall, 1);
  });

  it("is case-insensitive for keywords", function () {
    const result = scoreKeywordF1(["DFT", "Catalysis"], ["dft", "catalysis"]);
    assert.strictEqual(result.f1, 1);
    assert.strictEqual(result.precision, 1);
    assert.strictEqual(result.recall, 1);
  });

  // ---------------------------------------------------------------------------
  // ROUGE-L (new)
  // ---------------------------------------------------------------------------

  describe("ROUGE-L scoring", function () {
    it("returns 1 for identical text", function () {
      const score = scoreRougeL("the quick brown fox", "the quick brown fox");
      assert.strictEqual(score, 1);
    });

    it("returns 1 for both empty strings", function () {
      assert.strictEqual(scoreRougeL("", ""), 1);
    });

    it("returns 0 when candidate is empty but reference is not", function () {
      assert.strictEqual(scoreRougeL("", "the quick brown fox"), 0);
    });

    it("returns 0 when reference is empty but candidate is not", function () {
      assert.strictEqual(scoreRougeL("the quick brown fox", ""), 0);
    });

    it("scores partial overlap correctly", function () {
      // LCS of ["the","quick","fox"] and ["the","brown","fox"] is ["the","fox"] = 2
      const score = scoreRougeL("the quick fox", "the brown fox");
      assert.isAbove(score, 0);
      assert.isBelow(score, 1);
    });

    it("is case-insensitive", function () {
      const a = scoreRougeL("The Quick Brown Fox", "the quick brown fox");
      assert.strictEqual(a, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // Groundedness metrics (issue #33)
  // ---------------------------------------------------------------------------

  describe("citation precision", function () {
    it("returns 1 when all candidate citations are expected", function () {
      const score = scoreCitationPrecision(
        ["Smith2023", "Jones2022"],
        ["Smith2023", "Jones2022", "Brown2021"],
      );
      assert.strictEqual(score, 1);
    });

    it("returns 0 when no candidate citations match", function () {
      const score = scoreCitationPrecision(
        ["Unknown2020"],
        ["Smith2023", "Jones2022"],
      );
      assert.strictEqual(score, 0);
    });

    it("returns partial score for partial match", function () {
      const score = scoreCitationPrecision(
        ["Smith2023", "Unknown2020"],
        ["Smith2023", "Jones2022"],
      );
      assert.strictEqual(score, 0.5);
    });

    it("returns 1 for empty candidate citations", function () {
      assert.strictEqual(scoreCitationPrecision([], ["Smith2023"]), 1);
    });

    it("returns 0 for non-empty candidate but empty expected", function () {
      assert.strictEqual(scoreCitationPrecision(["Smith2023"], []), 0);
    });

    it("is case-insensitive", function () {
      const score = scoreCitationPrecision(["smith2023"], ["Smith2023"]);
      assert.strictEqual(score, 1);
    });
  });

  describe("citation recall", function () {
    it("returns 1 when all expected citations are found", function () {
      const score = scoreCitationRecall(
        ["Smith2023", "Jones2022", "Brown2021"],
        ["Smith2023", "Jones2022"],
      );
      assert.strictEqual(score, 1);
    });

    it("returns 0 when no expected citations are found", function () {
      const score = scoreCitationRecall(
        ["Unknown2020"],
        ["Smith2023", "Jones2022"],
      );
      assert.strictEqual(score, 0);
    });

    it("returns partial score for partial match", function () {
      const score = scoreCitationRecall(
        ["Smith2023"],
        ["Smith2023", "Jones2022"],
      );
      assert.strictEqual(score, 0.5);
    });

    it("returns 1 for empty expected citations", function () {
      assert.strictEqual(scoreCitationRecall(["Smith2023"], []), 1);
    });

    it("returns 0 for non-empty expected but empty candidate", function () {
      assert.strictEqual(scoreCitationRecall([], ["Smith2023"]), 0);
    });
  });

  describe("unsupported-claim rate", function () {
    it("returns 0 when all claims are supported", function () {
      const rate = scoreUnsupportedClaimRate(
        ["claim A is supported", "claim B is supported"],
        ["evidence for claim A", "evidence for claim B"],
      );
      assert.strictEqual(rate, 0);
    });

    it("returns 1 when no claims are supported", function () {
      const rate = scoreUnsupportedClaimRate(
        ["claim A", "claim B"],
        ["unrelated evidence"],
      );
      assert.strictEqual(rate, 1);
    });

    it("returns partial rate for partially supported claims", function () {
      const rate = scoreUnsupportedClaimRate(
        ["claim A", "claim B"],
        ["evidence for claim A"],
      );
      assert.strictEqual(rate, 0.5);
    });

    it("returns 0 for empty claims", function () {
      assert.strictEqual(scoreUnsupportedClaimRate([], ["evidence"]), 0);
    });

    it("returns 1 for non-empty claims but empty evidence", function () {
      assert.strictEqual(scoreUnsupportedClaimRate(["claim A"], []), 1);
    });
  });

  describe("evidence coverage", function () {
    it("returns 1 when all evidence chunks support a claim", function () {
      const coverage = scoreEvidenceCoverage(
        ["claim A", "claim B"],
        ["evidence for claim A", "evidence for claim B"],
      );
      assert.strictEqual(coverage, 1);
    });

    it("returns 0 when no evidence chunks support any claim", function () {
      const coverage = scoreEvidenceCoverage(
        ["claim A"],
        ["unrelated evidence"],
      );
      assert.strictEqual(coverage, 0);
    });

    it("returns partial coverage", function () {
      const coverage = scoreEvidenceCoverage(
        ["claim A"],
        ["evidence for claim A", "unrelated evidence"],
      );
      assert.strictEqual(coverage, 0.5);
    });

    it("returns 1 for empty evidence chunks", function () {
      assert.strictEqual(scoreEvidenceCoverage(["claim A"], []), 1);
    });

    it("returns 0 for non-empty evidence but empty claims", function () {
      assert.strictEqual(scoreEvidenceCoverage([], ["evidence"]), 0);
    });
  });

  describe("refusal quality", function () {
    it("returns 1 when correctly refused for insufficient evidence", function () {
      const quality = scoreRefusalQuality(
        "There is insufficient evidence to answer this question.",
        true,
      );
      assert.strictEqual(quality, 1);
    });

    it("returns 0 when failed to refuse for insufficient evidence", function () {
      const quality = scoreRefusalQuality("The answer is 42.", true);
      assert.strictEqual(quality, 0);
    });

    it("returns 1 when correctly answered for sufficient evidence", function () {
      const quality = scoreRefusalQuality(
        "The answer is 42 based on the evidence.",
        false,
      );
      assert.strictEqual(quality, 1);
    });

    it("returns 0 when incorrectly refused for sufficient evidence", function () {
      const quality = scoreRefusalQuality(
        "There is insufficient evidence to determine the answer.",
        false,
      );
      assert.strictEqual(quality, 0);
    });

    it("detects various refusal keywords", function () {
      assert.strictEqual(
        scoreRefusalQuality("Cannot answer from the provided sources.", false),
        0,
      );
      assert.strictEqual(
        scoreRefusalQuality("Not enough information to answer.", true),
        1,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Full case evaluation with groundedness
  // ---------------------------------------------------------------------------

  describe("evaluateAnalysisCase with groundedness", function () {
    it("includes groundedness metrics in evaluation result", function () {
      const result = evaluateAnalysisCase({
        id: "test-groundedness",
        title: "Test Groundedness",
        expectedFacts: ["fact1"],
        expectedKeywords: ["kw1"],
        candidateSummary: "fact1 is supported by evidence.",
        candidateKeywords: ["kw1"],
        expectedCitations: ["Smith2023"],
        candidateCitations: ["Smith2023"],
        evidenceChunks: ["evidence for fact1"],
        claims: ["fact1 is supported"],
        insufficientEvidence: false,
        sourceType: "pdf-text",
      });

      assert.property(result, "citationPrecision");
      assert.property(result, "citationRecall");
      assert.property(result, "unsupportedClaimRate");
      assert.property(result, "evidenceCoverage");
      assert.property(result, "refusalQuality");
      assert.property(result, "sourceType");
      assert.strictEqual(result.sourceType, "pdf-text");
    });

    it("calculates citation precision and recall correctly", function () {
      const result = evaluateAnalysisCase({
        id: "test-citations",
        title: "Test Citations",
        expectedFacts: ["fact1"],
        expectedKeywords: ["kw1"],
        candidateSummary: "fact1 with citation.",
        candidateKeywords: ["kw1"],
        expectedCitations: ["Smith2023", "Jones2022"],
        candidateCitations: ["Smith2023"],
      });

      assert.strictEqual(result.citationPrecision, 1); // Smith2023 matches
      assert.strictEqual(result.citationRecall, 0.5); // Only 1 of 2 expected found
    });

    it("calculates unsupported claim rate correctly", function () {
      const result = evaluateAnalysisCase({
        id: "test-claims",
        title: "Test Claims",
        expectedFacts: ["fact1"],
        expectedKeywords: ["kw1"],
        candidateSummary: "fact1 and unsupported claim.",
        candidateKeywords: ["kw1"],
        claims: ["fact1 is supported", "unsupported claim"],
        evidenceChunks: ["evidence for fact1"],
      });

      assert.strictEqual(result.unsupportedClaimRate, 0.5);
    });

    it("evaluates refusal quality correctly", function () {
      const resultRefused = evaluateAnalysisCase({
        id: "test-refusal-1",
        title: "Test Refusal 1",
        expectedFacts: [],
        expectedKeywords: ["insufficient"],
        candidateSummary: "There is insufficient evidence to answer.",
        candidateKeywords: ["insufficient"],
        insufficientEvidence: true,
      });

      assert.strictEqual(resultRefused.refusalQuality, 1);

      const resultNotRefused = evaluateAnalysisCase({
        id: "test-refusal-2",
        title: "Test Refusal 2",
        expectedFacts: ["fact1"],
        expectedKeywords: ["kw1"],
        candidateSummary: "The answer is fact1.",
        candidateKeywords: ["kw1"],
        insufficientEvidence: false,
      });

      assert.strictEqual(resultNotRefused.refusalQuality, 1);
    });
  });

  describe("runBenchmark with groundedness", function () {
    it("aggregates groundedness metrics across cases", function () {
      const report = runBenchmark([
        {
          id: "g1",
          title: "G1",
          expectedFacts: ["fact1"],
          expectedKeywords: ["kw1"],
          candidateSummary: "fact1 here.",
          candidateKeywords: ["kw1"],
          expectedCitations: ["Smith2023"],
          candidateCitations: ["Smith2023"],
          claims: ["fact1 is supported"],
          evidenceChunks: ["evidence for fact1"],
          sourceType: "pdf-text",
        },
        {
          id: "g2",
          title: "G2",
          expectedFacts: ["fact2"],
          expectedKeywords: ["kw2"],
          candidateSummary: "fact2 here.",
          candidateKeywords: ["kw2"],
          expectedCitations: ["Jones2022"],
          candidateCitations: ["Jones2022"],
          claims: ["fact2 is supported"],
          evidenceChunks: ["evidence for fact2"],
          sourceType: "metadata",
        },
      ]);

      assert.property(report, "avgCitationPrecision");
      assert.property(report, "avgCitationRecall");
      assert.property(report, "avgUnsupportedClaimRate");
      assert.property(report, "avgEvidenceCoverage");
      assert.property(report, "avgRefusalQuality");
      assert.property(report, "metadataCases");
      assert.property(report, "pdfTextCases");
      assert.strictEqual(report.metadataCases, 1);
      assert.strictEqual(report.pdfTextCases, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // Related-literature relevance (new)
  // ---------------------------------------------------------------------------

  describe("related-literature relevance", function () {
    it("returns 1 when expected is empty", function () {
      const result = scoreRelatedRelevance(["any paper"], []);
      assert.strictEqual(result.score, 1);
      assert.strictEqual(result.precision, 1);
      assert.strictEqual(result.recall, 1);
    });

    it("returns 0 when candidate is empty but expected is not", function () {
      const result = scoreRelatedRelevance([], ["important paper"]);
      assert.strictEqual(result.score, 0);
      assert.strictEqual(result.precision, 0);
      assert.strictEqual(result.recall, 0);
    });

    it("scores exact matches as 1", function () {
      const result = scoreRelatedRelevance(
        ["deep learning for biology", "AlphaFold comparison"],
        ["deep learning for biology", "AlphaFold comparison"],
      );
      assert.strictEqual(result.score, 1);
      assert.strictEqual(result.precision, 1);
      assert.strictEqual(result.recall, 1);
    });

    it("scores partial matches proportionally", function () {
      const result = scoreRelatedRelevance(
        ["deep learning for biology"],
        ["deep learning for biology", "AlphaFold comparison"],
      );
      assert.strictEqual(result.score, 0.5);
      assert.strictEqual(result.precision, 1);
      assert.strictEqual(result.recall, 0.5);
    });

    it("matches on substring containment", function () {
      const result = scoreRelatedRelevance(
        ["deep learning for biology applications"],
        ["deep learning for biology"],
      );
      assert.strictEqual(result.score, 1);
      assert.strictEqual(result.precision, 1);
      assert.strictEqual(result.recall, 1);
    });

    it("is case-insensitive", function () {
      const result = scoreRelatedRelevance(
        ["Deep Learning For Biology"],
        ["deep learning for biology"],
      );
      assert.strictEqual(result.score, 1);
      assert.strictEqual(result.precision, 1);
      assert.strictEqual(result.recall, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // Full case evaluation
  // ---------------------------------------------------------------------------

  describe("evaluateAnalysisCase", function () {
    it("evaluates a benchmark case against default thresholds", function () {
      const result = evaluateAnalysisCase({
        id: "fixture-perovskite-review",
        title: "Perovskite review",
        expectedFacts: ["perovskite stability", "bandgap"],
        expectedKeywords: ["perovskite", "stability"],
        candidateSummary:
          "This perovskite stability review compares bandgap trends across additives.",
        candidateKeywords: ["perovskite", "stability", "additives"],
        candidateRelated: ["stability of halide perovskites"],
        expectedRelated: ["stability of halide perovskites"],
      });

      assert.strictEqual(result.id, "fixture-perovskite-review");
      assert.isAbove(result.factCoverage, 0.8);
      assert.isAbove(result.keywordF1, 0.7);
      assert.isAbove(result.rougeL, 0);
      assert.isAbove(result.relatedRelevance, 0.7);
    });

    it("includes rougeL and relatedRelevance fields", function () {
      const result = evaluateAnalysisCase({
        id: "test",
        title: "Test",
        expectedFacts: ["catalysis"],
        expectedKeywords: ["DFT"],
        candidateSummary: "DFT study of catalysis mechanisms.",
        candidateKeywords: ["DFT", "catalysis"],
        candidateRelated: ["computational chemistry"],
        expectedRelated: ["computational chemistry"],
      });

      assert.property(result, "rougeL");
      assert.property(result, "relatedRelevance");
      assert.isNumber(result.rougeL);
      assert.isNumber(result.relatedRelevance);
    });

    it("marks case as not passed when below thresholds", function () {
      const result = evaluateAnalysisCase({
        id: "failing",
        title: "Failing",
        expectedFacts: ["alpha", "beta", "gamma", "delta", "epsilon"],
        expectedKeywords: ["one", "two", "three"],
        candidateSummary: "Only alpha mentioned.",
        candidateKeywords: ["unrelated"],
        candidateRelated: ["wrong paper"],
        expectedRelated: ["right paper"],
      });

      assert.isFalse(result.passed);
    });
  });

  // ---------------------------------------------------------------------------
  // Benchmark runner (new)
  // ---------------------------------------------------------------------------

  describe("runBenchmark", function () {
    it("aggregates metrics across multiple cases", function () {
      const report = runBenchmark([
        {
          id: "a",
          title: "A",
          expectedFacts: ["fact1"],
          expectedKeywords: ["kw1"],
          candidateSummary: "fact1 is here.",
          candidateKeywords: ["kw1"],
          candidateRelated: ["rel1"],
          expectedRelated: ["rel1"],
        },
        {
          id: "b",
          title: "B",
          expectedFacts: ["fact2"],
          expectedKeywords: ["kw2"],
          candidateSummary: "fact2 is here.",
          candidateKeywords: ["kw2"],
          candidateRelated: ["rel2"],
          expectedRelated: ["rel2"],
        },
      ]);

      assert.strictEqual(report.totalCases, 2);
      assert.strictEqual(report.avgFactCoverage, 1);
      assert.strictEqual(report.avgKeywordF1, 1);
      assert.strictEqual(report.avgRelatedRelevance, 1);
      assert.strictEqual(report.passRate, 1);
      assert.property(report, "runDate");
      assert.equal(report.perCase.length, 2);
    });

    it("handles empty input gracefully", function () {
      const report = runBenchmark([]);
      assert.strictEqual(report.totalCases, 0);
      assert.property(report, "runDate");
      assert.equal(report.perCase.length, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // Report formatter (new)
  // ---------------------------------------------------------------------------

  describe("formatReportMarkdown", function () {
    it("produces a markdown table with per-case results", function () {
      const report = runBenchmark([
        {
          id: "test-case",
          title: "Test",
          expectedFacts: ["fact1"],
          expectedKeywords: ["kw1"],
          candidateSummary: "fact1 here.",
          candidateKeywords: ["kw1"],
          candidateRelated: ["rel1"],
          expectedRelated: ["rel1"],
        },
      ]);
      const md = formatReportMarkdown(report);

      assert.include(md, "# AI Analysis Benchmark Report");
      assert.include(md, "test-case");
      assert.include(md, "Fact Coverage");
      assert.include(md, "Keyword F1");
      assert.include(md, "ROUGE-L");
      assert.include(md, "Related Relevance");
      assert.include(md, "Pass Rate");
    });
  });

  // ---------------------------------------------------------------------------
  // Fixture integration (inlined subset, 10 cases)
  // ---------------------------------------------------------------------------

  describe("benchmark fixture set", function () {
    it("runs benchmark across inlined fixtures without errors", function () {
      assert.isAtLeast(BENCHMARK_FIXTURES.length, 10);

      const report = runBenchmark(BENCHMARK_FIXTURES);
      assert.strictEqual(report.totalCases, BENCHMARK_FIXTURES.length);
      assert.isAbove(report.avgFactCoverage, 0);
      assert.isAbove(report.avgKeywordF1, 0);
      assert.isAtLeast(report.perCase.length, 10);
    });

    it("produces a readable report for all fixtures", function () {
      const report = runBenchmark(BENCHMARK_FIXTURES);
      const md = formatReportMarkdown(report);

      assert.isAbove(md.length, 200);
      assert.include(md, `**Total cases:** ${BENCHMARK_FIXTURES.length}`);
    });
  });

  // ---------------------------------------------------------------------------
  // LLM Provider Comparison (new)
  // ---------------------------------------------------------------------------

  describe("LLM provider comparison", function () {
    const baseCase: AIAnalysisBenchmarkCase = {
      id: "comparison-test",
      title: "Provider Comparison Test",
      expectedFacts: ["fact1", "fact2"],
      expectedKeywords: ["kw1", "kw2"],
      candidateSummary: "fact1 and fact2 are discussed.",
      candidateKeywords: ["kw1", "kw2"],
      candidateRelated: ["rel1"],
      expectedRelated: ["rel1"],
    };

    it("compares multiple providers on the same case", function () {
      const result = compareProviders(baseCase, [
        {
          provider: "openai",
          model: "gpt-4",
          candidateSummary: "fact1 and fact2 are discussed.",
          candidateKeywords: ["kw1", "kw2"],
          candidateRelated: ["rel1"],
        },
        {
          provider: "anthropic",
          model: "claude-3",
          candidateSummary: "fact1 is mentioned. fact2 is also discussed.",
          candidateKeywords: ["kw1"],
          candidateRelated: ["rel1"],
        },
      ]);

      assert.strictEqual(result.caseId, "comparison-test");
      assert.strictEqual(result.results.length, 2);
      assert.include(["openai", "anthropic"], result.bestProvider);
      assert.property(result.metricComparisons, "factCoverage");
      assert.property(result.metricComparisons, "keywordF1");
    });

    it("identifies best provider based on average metrics", function () {
      const result = compareProviders(baseCase, [
        {
          provider: "provider-a",
          model: "model-a",
          candidateSummary: "fact1 and fact2 are discussed.",
          candidateKeywords: ["kw1", "kw2"],
          candidateRelated: ["rel1"],
        },
        {
          provider: "provider-b",
          model: "model-b",
          candidateSummary: "Only fact1 mentioned.",
          candidateKeywords: ["kw1"],
          candidateRelated: [],
        },
      ]);

      assert.strictEqual(result.bestProvider, "provider-a");
    });

    it("formats provider comparison as markdown", function () {
      const comparisons = [
        compareProviders(baseCase, [
          {
            provider: "openai",
            model: "gpt-4",
            candidateSummary: "fact1 and fact2 are discussed.",
            candidateKeywords: ["kw1", "kw2"],
            candidateRelated: ["rel1"],
          },
          {
            provider: "anthropic",
            model: "claude-3",
            candidateSummary: "fact1 and fact2 are discussed in detail.",
            candidateKeywords: ["kw1", "kw2"],
            candidateRelated: ["rel1"],
          },
        ]),
      ];

      const md = formatProviderComparisonMarkdown(comparisons);

      assert.include(md, "# LLM Provider Comparison Report");
      assert.include(md, "openai");
      assert.include(md, "anthropic");
      assert.include(md, "gpt-4");
    });
  });
});
