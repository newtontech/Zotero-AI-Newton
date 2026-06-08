#!/usr/bin/env node
/**
 * Release smoke test script for XPI artifact validation
 *
 * This script validates that the generated XPI, manifest, update feed, and
 * public download URL all work together correctly.
 *
 * Usage: node scripts/smoke-test.ts
 * Or:   npm run smoke-test
 */

import { readFileSync, existsSync, readdirSync, mkdtempSync, rmSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { createReadStream } from "fs";
import { execSync } from "child_process";
import { tmpdir } from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface UpdateFeed {
  addons: {
    [key: string]: {
      updates: Array<{
        version: string;
        update_link: string;
        update_hash: string;
        applications: {
          zotero: {
            strict_min_version: string;
            strict_max_version: string;
          };
        };
      }>;
    };
  };
}

interface Manifest {
  manifest_version: number;
  name: string;
  version: string;
  description: string;
  author: string;
  applications: {
    zotero: {
      id: string;
      update_url: string;
      strict_min_version: string;
      strict_max_version: string;
    };
  };
}

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

const checks: CheckResult[] = [];

function addCheck(name: string, passed: boolean, message: string): void {
  checks.push({ name, passed, message });
}

function findXpiFile(buildDir: string): string | null {
  if (!existsSync(buildDir)) {
    return null;
  }

  const files = readdirSync(buildDir);
  const xpiFile = files.find((f: string) => f.endsWith(".xpi"));
  return xpiFile ? join(buildDir, xpiFile) : null;
}

function computeSha512(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha512");
    const stream = createReadStream(filePath);

    stream.on("data", (data) => hash.update(data as Buffer));
    stream.on("end", () => resolve(`sha512:${hash.digest("hex")}`));
    stream.on("error", reject);
  });
}

async function extractManifestFromXpi(
  xpiPath: string,
): Promise<Manifest | null> {
  const tempDir = mkdtempSync(join(tmpdir(), "xpi-extract-"));

  try {
    // Unzip the XPI (it's just a ZIP file)
    execSync(`unzip -o "${xpiPath}" -d "${tempDir}"`, { stdio: "pipe" });

    // Find manifest.json - try multiple locations
    const possiblePaths = [
      join(tempDir, "manifest.json"),
      join(tempDir, "addon", "manifest.json"),
    ];

    for (const manifestPath of possiblePaths) {
      if (existsSync(manifestPath)) {
        const content = readFileSync(manifestPath, "utf-8");
        return JSON.parse(content);
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting XPI:", error);
    return null;
  } finally {
    // Cleanup temp dir
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

async function checkUrlAccessible(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  console.log("🔍 Release Smoke Tests");
  console.log("=====================\n");

  // Read package.json for config
  const pkgPath = resolve(__dirname, "../package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  const version = pkg.version;
  const addonID = pkg.config.addonID;

  // 1. Find XPI file
  console.log("📦 Checking XPI artifact...");
  const buildDir = resolve(__dirname, "../.scaffold/build");
  const xpiFile = findXpiFile(buildDir);

  if (!xpiFile) {
    addCheck("XPI Exists", false, `No .xpi file found in ${buildDir}`);
    console.error("❌ No XPI file found. Run `npm run build` first.");
    printResults();
    process.exit(1);
  }

  addCheck("XPI Exists", true, `Found: ${xpiFile}`);
  console.log(`✅ Found XPI: ${xpiFile}`);

  // 2. Extract and validate manifest.json
  console.log("\n📋 Validating manifest.json...");
  const manifest = await extractManifestFromXpi(xpiFile);

  if (!manifest) {
    addCheck(
      "Manifest Valid",
      false,
      "Could not extract manifest.json from XPI",
    );
    console.error("❌ Could not extract manifest.json from XPI");
    printResults();
    process.exit(1);
  }

  addCheck("Manifest Valid", true, "manifest.json extracted successfully");

  // Validate add-on ID
  if (manifest.applications?.zotero?.id === addonID) {
    addCheck("Add-on ID", true, `ID matches: ${addonID}`);
  } else {
    addCheck(
      "Add-on ID",
      false,
      `Expected ${addonID}, got ${manifest.applications?.zotero?.id}`,
    );
  }

  // Validate version
  if (manifest.version === version) {
    addCheck("Version", true, `Version matches: ${version}`);
  } else {
    addCheck("Version", false, `Expected ${version}, got ${manifest.version}`);
  }

  // Validate Zotero compatibility
  const minVersion = manifest.applications?.zotero?.strict_min_version;
  const maxVersion = manifest.applications?.zotero?.strict_max_version;

  if (minVersion && maxVersion) {
    addCheck(
      "Zotero Compatibility",
      true,
      `Min: ${minVersion}, Max: ${maxVersion}`,
    );
  } else {
    addCheck(
      "Zotero Compatibility",
      false,
      "Missing strict_min_version or strict_max_version",
    );
  }

  // Validate update URL
  const updateUrl = manifest.applications?.zotero?.update_url;
  if (updateUrl) {
    addCheck("Update URL", true, `Update URL: ${updateUrl}`);
  } else {
    addCheck("Update URL", false, "Missing update_url in manifest");
  }

  // 3. Compute SHA512 and compare with update feed
  console.log("\n🔐 Validating update hash...");
  const actualHash = await computeSha512(xpiFile);

  // Read update feed
  const updateFile = version.includes("-") ? "update-beta.json" : "update.json";
  const updatePath = resolve(__dirname, `../release/${updateFile}`);

  if (!existsSync(updatePath)) {
    addCheck(
      "Update Feed Exists",
      false,
      `Update file not found: ${updatePath}`,
    );
  } else {
    addCheck("Update Feed Exists", true, `Found: ${updateFile}`);

    const updateFeed: UpdateFeed = JSON.parse(
      readFileSync(updatePath, "utf-8"),
    );
    const addonUpdates = updateFeed.addons[addonID];

    if (!addonUpdates) {
      addCheck(
        "Update Feed Addon",
        false,
        `Addon ${addonID} not found in update feed`,
      );
    } else {
      const update = addonUpdates.updates.find(
        (u: any) => u.version === version,
      );

      if (!update) {
        addCheck(
          "Update Feed Version",
          false,
          `Version ${version} not found in update feed`,
        );
      } else {
        addCheck(
          "Update Feed Version",
          true,
          `Found update entry for version ${version}`,
        );

        // Compare hash
        if (update.update_hash === actualHash) {
          addCheck("Update Hash", true, "SHA512 hash matches update feed");
        } else {
          addCheck(
            "Update Hash",
            false,
            "SHA512 hash does not match update feed",
          );
          console.log(`  Expected: ${update.update_hash}`);
          console.log(`  Actual:   ${actualHash}`);
        }

        // Validate update link
        const updateLink = update.update_link;
        if (updateLink) {
          addCheck("Update Link", true, `Update link: ${updateLink}`);

          // Check if URL is accessible (only in CI or with flag)
          if (process.env.CI || process.env.CHECK_URLS) {
            console.log("\n🌐 Checking public artifact URL...");
            const isAccessible = await checkUrlAccessible(updateLink);

            if (isAccessible) {
              addCheck(
                "Public URL Accessible",
                true,
                `URL returns 200: ${updateLink}`,
              );
            } else {
              addCheck(
                "Public URL Accessible",
                false,
                `URL not accessible: ${updateLink}`,
              );
            }
          } else {
            console.log(
              "\n⚠️  Skipping URL accessibility check (set CI=1 or CHECK_URLS=1 to enable)",
            );
          }
        }
      }
    }
  }

  printResults();

  const allPassed = checks.every((c) => c.passed);
  if (!allPassed) {
    console.log("\n❌ Smoke tests failed!");
    process.exit(1);
  }

  console.log("\n✅ All smoke tests passed!");
  process.exit(0);
}

function printResults(): void {
  console.log("\n\n📊 Smoke Test Results");
  console.log("====================\n");

  for (const check of checks) {
    const icon = check.passed ? "✅" : "❌";
    console.log(`${icon} ${check.name}: ${check.message}`);
  }

  const passedCount = checks.filter((c) => c.passed).length;
  console.log(
    `\n${passedCount === checks.length ? "✅" : "❌"} ${passedCount}/${checks.length} checks passed`,
  );
}

// Run main function
main().catch((error) => {
  console.error("❌ Smoke test error:", error);
  process.exit(1);
});
