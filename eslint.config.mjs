// @ts-check Let TS check this config file

import zotero from "@zotero-plugin/eslint-config";

export default [
  ...zotero({
    overrides: [
      {
        files: ["**/*.ts"],
        rules: {
          // The AI workspace relies on toolkit globals that may look unused to ESLint
          "@typescript-eslint/no-unused-vars": "off",
        },
      },
    ],
  }),
  {
    ignores: [
      "docs/assets/**", // Built website assets
      "docs/index.html", // Built website entry point
      "docs-src/node_modules/**", // Website dependencies
      ".omx/**", // Local orchestration state
      ".workbuddy/**", // Local orchestration state
      ".worktrees/**", // Local orchestration state
    ],
  },
];
