#!/usr/bin/env node
/**
 * Fixture validation script for AI analysis benchmark
 *
 * This script validates that fixture data is properly formatted and complete,
 * making it easier for domain experts to contribute real papers to the benchmark.
 *
 * Usage: node scripts/validate-fixtures.ts
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface AIAnalysisBenchmarkCase {
  id: string;
  title: string;
  expectedFacts: string[];
  expectedKeywords: string[];
  candidateSummary: string;
  candidateKeywords: string[];
  candidateRelated?: string[];
  expectedRelated?: string[];
  insufficientEvidence?: boolean;
  // Optional metadata for source-backed fixtures
  doi?: string;
  arxivId?: string;
  authors?: string[];
  year?: number;
  venue?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fixtureCount: number;
  fixturesWithMetadata: number;
}

function validateFixture(
  fixture: AIAnalysisBenchmarkCase,
  index: number,
): string[] {
  const errors: string[] = [];

  // Required fields
  if (!fixture.id || typeof fixture.id !== "string") {
    errors.push(`Fixture ${index}: Missing or invalid 'id' field`);
  }
  if (!fixture.title || typeof fixture.title !== "string") {
    errors.push(
      `Fixture ${index} (${fixture.id}): Missing or invalid 'title' field`,
    );
  }
  if (
    !Array.isArray(fixture.expectedFacts) ||
    (fixture.expectedFacts.length === 0 && !fixture.insufficientEvidence)
  ) {
    errors.push(
      `Fixture ${index} (${fixture.id}): 'expectedFacts' must be a non-empty array unless insufficientEvidence is true`,
    );
  }
  if (
    !Array.isArray(fixture.expectedKeywords) ||
    fixture.expectedKeywords.length === 0
  ) {
    errors.push(
      `Fixture ${index} (${fixture.id}): 'expectedKeywords' must be a non-empty array`,
    );
  }
  if (
    !fixture.candidateSummary ||
    typeof fixture.candidateSummary !== "string"
  ) {
    errors.push(
      `Fixture ${index} (${fixture.id}): Missing or invalid 'candidateSummary' field`,
    );
  }
  if (
    !Array.isArray(fixture.candidateKeywords) ||
    fixture.candidateKeywords.length === 0
  ) {
    errors.push(
      `Fixture ${index} (${fixture.id}): 'candidateKeywords' must be a non-empty array`,
    );
  }

  // Optional but recommended fields
  if (
    fixture.candidateRelated !== undefined &&
    !Array.isArray(fixture.candidateRelated)
  ) {
    errors.push(
      `Fixture ${index} (${fixture.id}): 'candidateRelated' must be an array if provided`,
    );
  }
  if (
    fixture.expectedRelated !== undefined &&
    !Array.isArray(fixture.expectedRelated)
  ) {
    errors.push(
      `Fixture ${index} (${fixture.id}): 'expectedRelated' must be an array if provided`,
    );
  }

  // Content validation
  if (fixture.expectedFacts && Array.isArray(fixture.expectedFacts)) {
    fixture.expectedFacts.forEach((fact, i) => {
      if (typeof fact !== "string" || fact.trim().length === 0) {
        errors.push(
          `Fixture ${index} (${fixture.id}): expectedFacts[${i}] is not a valid non-empty string`,
        );
      }
    });
  }

  if (fixture.expectedKeywords && Array.isArray(fixture.expectedKeywords)) {
    fixture.expectedKeywords.forEach((keyword, i) => {
      if (typeof keyword !== "string" || keyword.trim().length === 0) {
        errors.push(
          `Fixture ${index} (${fixture.id}): expectedKeywords[${i}] is not a valid non-empty string`,
        );
      }
    });
  }

  return errors;
}

function validateFixtures(
  fixtures: AIAnalysisBenchmarkCase[],
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    fixtureCount: fixtures.length,
    fixturesWithMetadata: 0,
  };

  // Validate each fixture
  fixtures.forEach((fixture, index) => {
    const fixtureErrors = validateFixture(fixture, index);
    result.errors.push(...fixtureErrors);

    // Check for metadata (recommended for real papers)
    if (fixture.doi || fixture.arxivId || fixture.year) {
      result.fixturesWithMetadata++;
    } else {
      result.warnings.push(
        `Fixture ${index} (${fixture.id}): No source metadata (doi, arxivId, year)`,
      );
    }
  });

  // Check for duplicate IDs
  const ids = fixtures.map((f) => f.id);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    result.errors.push(`Duplicate fixture IDs detected`);
  }

  result.valid = result.errors.length === 0;
  return result;
}

function main() {
  try {
    const fixturePath = resolve(
      __dirname,
      "../test/fixtures/ai-analysis-benchmark.json",
    );
    const fixtureContent = readFileSync(fixturePath, "utf-8");
    const fixtures: AIAnalysisBenchmarkCase[] = JSON.parse(fixtureContent);

    const result = validateFixtures(fixtures);

    // Print results
    console.log("🔍 AI Analysis Benchmark Fixture Validation");
    console.log("==========================================\n");
    console.log(`📊 Total fixtures: ${result.fixtureCount}`);
    console.log(`📝 Fixtures with metadata: ${result.fixturesWithMetadata}`);
    console.log(`🎯 Target (issue #15): 50 papers`);
    console.log(
      `📈 Progress: ${result.fixtureCount}/50 (${((result.fixtureCount / 50) * 100).toFixed(1)}%)`,
    );
    console.log(
      `📋 Gap to target: ${50 - result.fixtureCount} papers needed\n`,
    );

    if (result.errors.length > 0) {
      console.log("❌ Validation Errors:");
      result.errors.forEach((error) => console.log(`   - ${error}`));
      console.log("");
    }

    if (result.warnings.length > 0) {
      console.log("⚠️  Warnings:");
      result.warnings.forEach((warning) => console.log(`   - ${warning}`));
      console.log("");
    }

    if (result.valid) {
      console.log("✅ All fixtures are valid!");
      console.log(
        "\n💡 Tip: Add source metadata (doi, arxivId, year) to fixtures for better traceability.",
      );
    } else {
      console.log("❌ Validation failed. Please fix the errors above.");
    }

    process.exit(result.valid ? 0 : 1);
  } catch (error) {
    console.error("❌ Error reading or parsing fixtures:", error);
    process.exit(1);
  }
}

// Check if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}

export { validateFixture, validateFixtures, type ValidationResult };
