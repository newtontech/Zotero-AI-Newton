#!/usr/bin/env node
/**
 * Benchmark groundedness script (issue #33)
 *
 * Runs the full benchmark with groundedness metrics and outputs a
 * markdown report to the console.
 *
 * Usage: node scripts/benchmark-groundedness.ts
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  runBenchmark,
  formatReportMarkdown,
} from "../src/modules/aiEvaluation.js";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function main() {
  try {
    const fixturePath = resolve(
      __dirname,
      "../test/fixtures/ai-analysis-benchmark.json",
    );
    const fixtureContent = readFileSync(fixturePath, "utf-8");
    const fixtures = JSON.parse(fixtureContent);

    console.log("Running benchmark with groundedness metrics...\n");
    const report = runBenchmark(fixtures);
    const md = formatReportMarkdown(report);
    console.log(md);
  } catch (error) {
    console.error("❌ Error running groundedness benchmark:", error);
    process.exit(1);
  }
}

// Check if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}

export { main };
