import { assert } from "chai";
import {
  evaluateAnalysisCase,
  scoreFactCoverage,
  scoreKeywordF1,
} from "../src/modules/aiEvaluation";

describe("AI analysis evaluation", function () {
  it("scores required fact coverage from a grounded summary", function () {
    const score = scoreFactCoverage(
      "The study reports perovskite stability and a bandgap screening workflow.",
      ["perovskite stability", "bandgap screening"],
    );

    assert.strictEqual(score, 1);
  });

  it("scores keyword extraction with F1", function () {
    const score = scoreKeywordF1(
      ["perovskite", "bandgap", "stability"],
      ["perovskite", "defects", "stability"],
    );

    assert.closeTo(score, 0.67, 0.01);
  });

  it("evaluates a benchmark case against default thresholds", function () {
    const result = evaluateAnalysisCase({
      id: "fixture-perovskite-review",
      title: "Perovskite review",
      expectedFacts: ["perovskite stability", "bandgap"],
      expectedKeywords: ["perovskite", "stability"],
      candidateSummary:
        "This perovskite stability review compares bandgap trends across additives.",
      candidateKeywords: ["perovskite", "stability", "additives"],
    });

    assert.isTrue(result.passed);
    assert.strictEqual(result.id, "fixture-perovskite-review");
  });
});
