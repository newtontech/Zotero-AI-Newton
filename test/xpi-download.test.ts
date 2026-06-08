import { assert } from "chai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

describe("XPI Download URLs", function () {
  let updateBeta: any;
  let readmeContent: string;
  let readmeZhContent: string;
  let heroJsContent: string;
  let configContent: string;

  before(function () {
    updateBeta = JSON.parse(
      fs.readFileSync(path.join(rootDir, "release", "update-beta.json"), "utf-8")
    );
    readmeContent = fs.readFileSync(path.join(rootDir, "README.md"), "utf-8");
    readmeZhContent = fs.readFileSync(
      path.join(rootDir, "release", "README-zhCN.md"),
      "utf-8"
    );
    heroJsContent = fs.readFileSync(
      path.join(rootDir, "docs", "js", "components", "Hero.js"),
      "utf-8"
    );
    configContent = fs.readFileSync(
      path.join(rootDir, "zotero-plugin.config.ts"),
      "utf-8"
    );
  });

  it("update-beta.json should have valid GitHub release asset URL", function () {
    const updateLink = updateBeta.addons["zotero-ai@local"].updates[0].update_link;
    assert.match(
      updateLink,
      /^https:\/\/github\.com\/newtontech\/Zotero-AI-Newton\/releases\/download\//,
      "update_link should point to GitHub release asset"
    );
    assert.notMatch(
      updateLink,
      /raw\.githubusercontent\.com/,
      "update_link should not point to raw.githubusercontent.com"
    );
    assert.notMatch(
      updateLink,
      /\/release\/.*\.xpi$/,
      "update_link should not point to release/ directory in repo"
    );
  });

  it("README.md should have valid download URLs", function () {
    assert.notMatch(
      readmeContent,
      /https:\/\/raw\.githubusercontent\.com.*release.*\.xpi/,
      "README.md should not contain raw.githubusercontent.com URLs pointing to release/ XPI"
    );
  });

  it("release/README-zhCN.md should have valid download URLs", function () {
    assert.notMatch(
      readmeZhContent,
      /https:\/\/raw\.githubusercontent\.com.*release.*\.xpi/,
      "README-zhCN.md should not contain raw.githubusercontent.com URLs pointing to release/ XPI"
    );
  });

  it("Hero.js should have valid download URL", function () {
    assert.notMatch(
      heroJsContent,
      /https:\/\/raw\.githubusercontent\.com.*release.*\.xpi/,
      "Hero.js should not contain raw.githubusercontent.com URLs pointing to release/ XPI"
    );
  });

  it("zotero-plugin.config.ts should have valid xpiDownloadLink", function () {
    const match = configContent.match(/xpiDownloadLink:\s*`([^`]+)`/);
    assert.exists(match, "xpiDownloadLink should be defined in config");
    if (match) {
      const url = match[1];
      assert.match(
        url,
        /https:\/\/github\.com\/newtontech\/Zotero-AI-Newton\/releases/,
        "xpiDownloadLink should point to GitHub releases"
      );
      assert.notMatch(
        url,
        /raw\.githubusercontent\.com/,
        "xpiDownloadLink should not point to raw.githubusercontent.com"
      );
    }
  });

  it("all files should use consistent GitHub releases URL pattern", function () {
    const releaseAssetPattern =
      /https:\/\/github\.com\/newtontech\/Zotero-AI-Newton\/releases\/download\//;
    const releasesLatestPattern =
      /https:\/\/github\.com\/newtontech\/Zotero-AI-Newton\/releases\/latest/;

    const updateLink = updateBeta.addons["zotero-ai@local"].updates[0].update_link;
    assert.match(
      updateLink,
      releaseAssetPattern,
      "update-beta.json should use releases/download/ URL"
    );

    // README.md should point to releases page or release asset
    assert.match(
      readmeContent,
      /https:\/\/github\.com\/newtontech\/Zotero-AI-Newton\/releases/,
      "README.md should point to GitHub releases"
    );
  });
});
