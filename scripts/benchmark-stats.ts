#!/usr/bin/env node
/**
 * Benchmark statistics script
 *
 * This script provides detailed statistics about the current AI analysis benchmark,
 * helping track progress toward the 50-paper goal for issue #15 and groundedness
 * metrics for issue #33.
 *
 * Usage: node scripts/benchmark-stats.ts
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
  doi?: string;
  arxivId?: string;
  authors?: string[];
  year?: number;
  venue?: string;
  // Groundedness fields (issue #33)
  expectedCitations?: string[];
  candidateCitations?: string[];
  evidenceChunks?: string[];
  claims?: string[];
  insufficientEvidence?: boolean;
  sourceType?: "metadata" | "pdf-text";
}

interface DomainStats {
  domain: string;
  count: number;
  fixtureIds: string[];
}

interface BenchmarkStatistics {
  totalFixtures: number;
  targetCount: number;
  progress: number;
  gap: number;
  fixturesWithMetadata: number;
  domains: DomainStats[];
  averageFacts: number;
  averageKeywords: number;
  averageRelated: number;
  // Groundedness statistics (issue #33)
  fixturesWithCitations: number;
  fixturesWithEvidence: number;
  fixturesWithClaims: number;
  insufficientEvidenceCases: number;
  metadataCases: number;
  pdfTextCases: number;
}

function categorizeDomain(fixture: AIAnalysisBenchmarkCase): string {
  const title = fixture.title.toLowerCase();
  const keywords = fixture.expectedKeywords.join(" ").toLowerCase();
  const combined = `${title} ${keywords}`;

  // Domain categorization logic
  if (
    combined.includes("protein") ||
    combined.includes("crispr") ||
    combined.includes("gene") ||
    combined.includes("drug") ||
    combined.includes("nanomedicine")
  ) {
    return "Biology/Health";
  }
  if (
    combined.includes("catalysi") ||
    combined.includes("co2") ||
    combined.includes("reaction") ||
    combined.includes("synthesis") ||
    combined.includes("dft") ||
    combined.includes("quantum chemistry")
  ) {
    return "Chemistry";
  }
  if (
    combined.includes("perovskite") ||
    combined.includes("battery") ||
    combined.includes("mof") ||
    combined.includes("thermoelectric") ||
    combined.includes("nanoparticle") ||
    combined.includes("graphene") ||
    combined.includes("materials")
  ) {
    return "Materials Science";
  }
  if (
    combined.includes("molecular dynamics") ||
    combined.includes("quantum") ||
    combined.includes("physics")
  ) {
    return "Physics";
  }
  if (
    combined.includes("machine learning") ||
    combined.includes("ai") ||
    combined.includes("neural") ||
    (combined.includes("retrosynthesis") && combined.includes("ai"))
  ) {
    return "AI/ML";
  }

  return "Other";
}

function calculateStatistics(
  fixtures: AIAnalysisBenchmarkCase[],
): BenchmarkStatistics {
  const targetCount = 50;
  const totalFixtures = fixtures.length;
  const fixturesWithMetadata = fixtures.filter(
    (f) => f.doi || f.arxivId || f.year || f.authors,
  ).length;

  // Groundedness statistics (issue #33)
  const fixturesWithCitations = fixtures.filter(
    (f) => f.expectedCitations && f.expectedCitations.length > 0,
  ).length;
  const fixturesWithEvidence = fixtures.filter(
    (f) => f.evidenceChunks && f.evidenceChunks.length > 0,
  ).length;
  const fixturesWithClaims = fixtures.filter(
    (f) => f.claims && f.claims.length > 0,
  ).length;
  const insufficientEvidenceCases = fixtures.filter(
    (f) => f.insufficientEvidence === true,
  ).length;
  const metadataCases = fixtures.filter(
    (f) => f.sourceType === "metadata",
  ).length;
  const pdfTextCases = fixtures.filter(
    (f) => f.sourceType === "pdf-text",
  ).length;

  // Domain analysis
  const domainMap = new Map<string, DomainStats>();
  fixtures.forEach((fixture) => {
    const domain = categorizeDomain(fixture);
    if (!domainMap.has(domain)) {
      domainMap.set(domain, { domain, count: 0, fixtureIds: [] });
    }
    const stats = domainMap.get(domain)!;
    stats.count++;
    stats.fixtureIds.push(fixture.id);
  });

  // Content averages
  const avgFacts =
    fixtures.reduce((sum, f) => sum + f.expectedFacts.length, 0) /
    totalFixtures;
  const avgKeywords =
    fixtures.reduce((sum, f) => sum + f.expectedKeywords.length, 0) /
    totalFixtures;
  const avgRelated =
    fixtures.reduce((sum, f) => sum + (f.expectedRelated?.length || 0), 0) /
    totalFixtures;

  return {
    totalFixtures,
    targetCount,
    progress: (totalFixtures / targetCount) * 100,
    gap: targetCount - totalFixtures,
    fixturesWithMetadata,
    domains: Array.from(domainMap.values()).sort((a, b) => b.count - a.count),
    averageFacts: Math.round(avgFacts * 10) / 10,
    averageKeywords: Math.round(avgKeywords * 10) / 10,
    averageRelated: Math.round(avgRelated * 10) / 10,
    // Groundedness statistics
    fixturesWithCitations,
    fixturesWithEvidence,
    fixturesWithClaims,
    insufficientEvidenceCases,
    metadataCases,
    pdfTextCases,
  };
}

function main() {
  try {
    const fixturePath = resolve(
      __dirname,
      "../test/fixtures/ai-analysis-benchmark.json",
    );
    const fixtureContent = readFileSync(fixturePath, "utf-8");
    const fixtures: AIAnalysisBenchmarkCase[] = JSON.parse(fixtureContent);

    const stats = calculateStatistics(fixtures);

    console.log("📊 AI Analysis Benchmark Statistics");
    console.log("====================================\n");
    console.log(`🎯 Target (Issue #15): ${stats.targetCount} papers`);
    console.log(`📈 Current: ${stats.totalFixtures} papers`);
    console.log(`📊 Progress: ${stats.progress.toFixed(1)}%`);
    console.log(`📋 Gap: ${stats.gap} papers needed\n`);

    console.log("🔍 Metadata Quality");
    console.log("-------------------");
    console.log(
      `Fixtures with source metadata: ${stats.fixturesWithMetadata}/${stats.totalFixtures}`,
    );
    console.log(
      `Metadata coverage: ${((stats.fixturesWithMetadata / stats.totalFixtures) * 100).toFixed(1)}%\n`,
    );

    console.log("📚 Domain Coverage");
    console.log("-----------------");
    stats.domains.forEach(({ domain, count, fixtureIds }) => {
      console.log(`${domain}: ${count} papers`);
      console.log(`  ${fixtureIds.map((id) => `  • ${id}`).join("\n")}`);
    });
    console.log("");

    console.log("📏 Content Statistics");
    console.log("--------------------");
    console.log(`Average facts per fixture: ${stats.averageFacts}`);
    console.log(`Average keywords per fixture: ${stats.averageKeywords}`);
    console.log(
      `Average related papers per fixture: ${stats.averageRelated}\n`,
    );

    console.log("📊 Groundedness Metrics (Issue #33)");
    console.log("-----------------------------------");
    console.log(
      `Fixtures with citations: ${stats.fixturesWithCitations}/${stats.totalFixtures}`,
    );
    console.log(
      `Fixtures with evidence chunks: ${stats.fixturesWithEvidence}/${stats.totalFixtures}`,
    );
    console.log(
      `Fixtures with claims: ${stats.fixturesWithClaims}/${stats.totalFixtures}`,
    );
    console.log(
      `Insufficient-evidence cases: ${stats.insufficientEvidenceCases}`,
    );
    console.log(`Metadata-only cases: ${stats.metadataCases}`);
    console.log(`PDF-text cases: ${stats.pdfTextCases}`);
    console.log("");

    console.log("🚀 Recommended Next Steps");
    console.log("-------------------------");
    if (stats.gap > 0) {
      console.log(`1. Add ${stats.gap} more source-backed papers`);
      console.log("2. Focus on underrepresented domains");
      console.log("3. Add source metadata (DOI, arXiv) to existing fixtures");
      console.log("4. Verify ground truth accuracy for all fixtures");
    } else {
      console.log("✅ Target reached! Consider:");
      console.log("- Expanding to additional domains");
      console.log("- Improving metadata coverage");
      console.log("- Adding diversity within domains");
    }
    console.log("");

    console.log("📖 Contribute");
    console.log("-------------");
    console.log(
      "See test/fixtures/CONTRIBUTING.md for guidance on adding papers.\n",
    );
  } catch (error) {
    console.error("❌ Error generating statistics:", error);
    process.exit(1);
  }
}

// Check if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}

export { calculateStatistics, type BenchmarkStatistics };
