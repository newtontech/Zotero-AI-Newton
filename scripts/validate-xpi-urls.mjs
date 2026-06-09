#!/usr/bin/env node
/* global console, process */

/**
 * Validate XPI download URLs in project files
 * This script can run without Zotero installed
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

let hasErrors = false;

function check(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    hasErrors = true;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// Read files
const updateBeta = JSON.parse(
  fs.readFileSync(path.join(rootDir, "release", "update-beta.json"), "utf-8"),
);
const readme = fs.readFileSync(path.join(rootDir, "README.md"), "utf-8");
const readmeZh = fs.readFileSync(
  path.join(rootDir, "release", "README-zhCN.md"),
  "utf-8",
);
const heroJs = fs.readFileSync(
  path.join(rootDir, "docs", "js", "components", "Hero.js"),
  "utf-8",
);
const config = fs.readFileSync(
  path.join(rootDir, "zotero-plugin.config.ts"),
  "utf-8",
);

console.log("Validating XPI download URLs...\n");

// Test update-beta.json
const updateLink = updateBeta.addons["zotero-ai@local"].updates[0].update_link;
check(
  updateLink.startsWith(
    "https://github.com/newtontech/Zotero-AI-Newton/releases/download/",
  ),
  "update-beta.json update_link should point to GitHub release asset",
);
check(
  !updateLink.includes("raw.githubusercontent.com"),
  "update-beta.json should not use raw.githubusercontent.com",
);
check(
  !updateLink.includes("/release/"),
  "update-beta.json should not point to release/ directory in repo",
);

// Test README.md
check(
  !readme.includes("raw.githubusercontent.com/release/"),
  "README.md should not contain raw.githubusercontent.com URLs pointing to release/ XPI",
);

// Test release/README-zhCN.md
check(
  !readmeZh.includes("raw.githubusercontent.com/release/"),
  "README-zhCN.md should not contain raw.githubusercontent.com URLs pointing to release/ XPI",
);

// Test Hero.js
check(
  !heroJs.includes("raw.githubusercontent.com/release/"),
  "Hero.js should not contain raw.githubusercontent.com URLs pointing to release/ XPI",
);

// Test zotero-plugin.config.ts
const xpiDownloadLinkMatch = config.match(/xpiDownloadLink:\s*`([^`]+)`/);
check(xpiDownloadLinkMatch, "xpiDownloadLink should be defined in config");
if (xpiDownloadLinkMatch) {
  const url = xpiDownloadLinkMatch[1];
  check(
    url.includes("github.com/newtontech/Zotero-AI-Newton/releases"),
    "xpiDownloadLink should point to GitHub releases",
  );
  check(
    !url.includes("raw.githubusercontent.com"),
    "xpiDownloadLink should not point to raw.githubusercontent.com",
  );
}

console.log(
  "\n" + (hasErrors ? "❌ Validation FAILED" : "✅ All validations PASSED"),
);

process.exit(hasErrors ? 1 : 0);
