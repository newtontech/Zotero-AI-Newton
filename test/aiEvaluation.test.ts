import { assert } from "chai";
import {
  evaluateAnalysisCase,
  formatReportMarkdown,
  runBenchmark,
  scoreFactCoverage,
  scoreKeywordF1,
  scoreRelatedRelevance,
  scoreRougeL,
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
    const score = scoreKeywordF1(
      ["perovskite", "bandgap", "stability"],
      ["perovskite", "defects", "stability"],
    );

    assert.closeTo(score, 0.67, 0.01);
  });

  it("returns 1 when both keyword sets are empty", function () {
    assert.strictEqual(scoreKeywordF1([], []), 1);
  });

  it("returns 0 when candidate has no keywords", function () {
    assert.strictEqual(scoreKeywordF1([], ["catalysis", "DFT"]), 0);
  });

  it("returns 0 when expected has no keywords", function () {
    assert.strictEqual(scoreKeywordF1(["catalysis"], []), 0);
  });

  it("returns 1 for identical keyword sets", function () {
    assert.strictEqual(scoreKeywordF1(["alpha", "beta"], ["alpha", "beta"]), 1);
  });

  it("is case-insensitive for keywords", function () {
    const score = scoreKeywordF1(["DFT", "Catalysis"], ["dft", "catalysis"]);
    assert.strictEqual(score, 1);
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
  // Related-literature relevance (new)
  // ---------------------------------------------------------------------------

  describe("related-literature relevance", function () {
    it("returns 1 when expected is empty", function () {
      assert.strictEqual(scoreRelatedRelevance(["any paper"], []), 1);
    });

    it("returns 0 when candidate is empty but expected is not", function () {
      assert.strictEqual(scoreRelatedRelevance([], ["important paper"]), 0);
    });

    it("scores exact matches as 1", function () {
      assert.strictEqual(
        scoreRelatedRelevance(
          ["deep learning for biology", "AlphaFold comparison"],
          ["deep learning for biology", "AlphaFold comparison"],
        ),
        1,
      );
    });

    it("scores partial matches proportionally", function () {
      const score = scoreRelatedRelevance(
        ["deep learning for biology"],
        ["deep learning for biology", "AlphaFold comparison"],
      );
      assert.strictEqual(score, 0.5);
    });

    it("matches on substring containment", function () {
      const score = scoreRelatedRelevance(
        ["deep learning for biology applications"],
        ["deep learning for biology"],
      );
      assert.strictEqual(score, 1);
    });

    it("is case-insensitive", function () {
      assert.strictEqual(
        scoreRelatedRelevance(
          ["Deep Learning For Biology"],
          ["deep learning for biology"],
        ),
        1,
      );
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
});
