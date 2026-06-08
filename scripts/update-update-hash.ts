#!/usr/bin/env node
/**
 * Update update-beta.json with the correct hash for the built XPI
 *
 * Usage: node scripts/update-update-hash.ts
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { createReadStream } from "fs";
import { rmSync, mkdtempSync, readdirSync } from "fs";
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

function computeSha512(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha512");
    const stream = createReadStream(filePath);

    stream.on("data", (data) => hash.update(data as Buffer));
    stream.on("end", () => resolve(`sha512:${hash.digest("hex")}`));
    stream.on("error", reject);
  });
}

async function main() {
  // Read package.json for config
  const pkgPath = resolve(__dirname, "../package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  const version = pkg.version;
  const addonID = pkg.config.addonID;

  // Find XPI file
  const buildDir = resolve(__dirname, "../.scaffold/build");
  const files = readdirSync(buildDir);
  const xpiFile = files.find((f: string) => f.endsWith(".xpi"));

  if (!xpiFile) {
    console.error("❌ No XPI file found. Run `npm run build` first.");
    process.exit(1);
  }

  const xpiPath = join(buildDir, xpiFile);
  console.log(`📦 Found XPI: ${xpiPath}`);

  // Compute hash
  const hash = await computeSha512(xpiPath);
  console.log(`🔐 Computed hash: ${hash}`);

  // Read update feed
  const updateFile = version.includes("-") ? "update-beta.json" : "update.json";
  const updatePath = resolve(__dirname, `../release/${updateFile}`);

  if (!existsSync(updatePath)) {
    console.error(`❌ Update file not found: ${updatePath}`);
    process.exit(1);
  }

  const updateFeed: UpdateFeed = JSON.parse(readFileSync(updatePath, "utf-8"));

  // Find and update the hash
  const addonUpdates = updateFeed.addons[addonID];
  if (!addonUpdates) {
    console.error(`❌ Addon ${addonID} not found in update feed`);
    process.exit(1);
  }

  const update = addonUpdates.updates.find((u: any) => u.version === version);
  if (!update) {
    console.error(`❌ Version ${version} not found in update feed`);
    process.exit(1);
  }

  const oldHash = update.update_hash;
  update.update_hash = hash;

  // Write back
  writeFileSync(updatePath, JSON.stringify(updateFeed, null, 2) + "\n");
  console.log(`✅ Updated hash in ${updateFile}`);
  console.log(`   Old: ${oldHash}`);
  console.log(`   New: ${hash}`);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
