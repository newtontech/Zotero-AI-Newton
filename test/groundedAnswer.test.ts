import { assert } from "chai";
import { parseGroundedAnswer, GroundedAnswer } from "../src/modules/llmClient";
import { formatGroundedAnswerForCopy } from "../src/modules/aiWorkspace";

describe("groundedAnswer", function () {
  describe("parseGroundedAnswer", function () {
    it("should parse valid JSON with all fields", function () {
      const jsonResponse = `Here is my answer:

\`\`\`json
{
  "answer": "This is a test answer about machine learning.",
  "citations": [
    {
      "evidenceId": "item-123",
      "title": "Deep Learning",
      "page": 42,
      "quote": "Neural networks are powerful"
    }
  ],
  "unsupportedClaims": ["Claim without evidence"],
  "confidence": "high"
}
\`\`\``;

      const result = parseGroundedAnswer(jsonResponse);

      assert.isObject(result);
      assert.isDefined((result as GroundedAnswer).answer);
      assert.equal(
        (result as GroundedAnswer).answer,
        "This is a test answer about machine learning.",
      );
      assert.equal((result as GroundedAnswer).confidence, "high");
      assert.equal((result as GroundedAnswer).citations.length, 1);
      assert.equal(
        (result as GroundedAnswer).citations[0].title,
        "Deep Learning",
      );
      assert.equal((result as GroundedAnswer).citations[0].page, 42);
      assert.isDefined((result as GroundedAnswer).unsupportedClaims);
      assert.equal(
        (result as GroundedAnswer).unsupportedClaims![0],
        "Claim without evidence",
      );
    });

    it("should parse JSON without code blocks", function () {
      const jsonResponse = `{
  "answer": "Simple answer",
  "citations": [],
  "confidence": "medium"
}`;

      const result = parseGroundedAnswer(jsonResponse);

      assert.isObject(result);
      assert.equal((result as GroundedAnswer).answer, "Simple answer");
      assert.equal((result as GroundedAnswer).confidence, "medium");
    });

    it("should return plain text when JSON parsing fails", function () {
      const plainText =
        "This is a plain text answer without any JSON structure.";

      const result = parseGroundedAnswer(plainText);

      assert.isString(result);
      assert.equal(result, plainText);
    });

    it("should return plain text for invalid JSON", function () {
      const invalidJson = "Here is some text with { invalid json";

      const result = parseGroundedAnswer(invalidJson);

      assert.isString(result);
      assert.include(result as string, "invalid json");
    });

    it("should handle missing optional fields", function () {
      const minimalJson = `{
  "answer": "Minimal answer"
}`;

      const result = parseGroundedAnswer(minimalJson);

      assert.isObject(result);
      assert.equal((result as GroundedAnswer).answer, "Minimal answer");
      assert.equal((result as GroundedAnswer).confidence, "medium"); // default
      assert.isArray((result as GroundedAnswer).citations);
      assert.equal((result as GroundedAnswer).citations.length, 0);
    });

    it("should normalize confidence values", function () {
      const json = `{
  "answer": "Test",
  "confidence": "invalid-value"
}`;

      const result = parseGroundedAnswer(json);

      assert.isObject(result);
      assert.equal((result as GroundedAnswer).confidence, "medium"); // fallback to medium
    });
  });

  describe("formatGroundedAnswerForCopy", function () {
    it("should format answer with citations", function () {
      const answer: GroundedAnswer = {
        answer: "This is the answer.",
        citations: [
          {
            evidenceId: "item-1",
            title: "Test Paper",
            page: 5,
            quote: "Important finding",
          },
        ],
        confidence: "high",
      };

      const result = formatGroundedAnswerForCopy(answer);

      assert.include(result, "This is the answer.");
      assert.include(result, "Citations:");
      assert.include(result, "Test Paper");
      assert.include(result, "p. 5");
      assert.include(result, "Important finding");
      assert.include(result, "Confidence: high");
    });

    it("should format answer with unsupported claims", function () {
      const answer: GroundedAnswer = {
        answer: "Answer with some unsupported claims.",
        citations: [],
        unsupportedClaims: ["Unsupported claim 1", "Unsupported claim 2"],
        confidence: "low",
      };

      const result = formatGroundedAnswerForCopy(answer);

      assert.include(result, "Unsupported claims:");
      assert.include(result, "Unsupported claim 1");
      assert.include(result, "Unsupported claim 2");
    });

    it("should handle answer without citations or unsupported claims", function () {
      const answer: GroundedAnswer = {
        answer: "Simple answer.",
        citations: [],
        confidence: "medium",
      };

      const result = formatGroundedAnswerForCopy(answer);

      assert.include(result, "Simple answer.");
      assert.include(result, "Confidence: medium");
      assert.notInclude(result, "Citations:");
      assert.notInclude(result, "Unsupported claims:");
    });
  });
});
