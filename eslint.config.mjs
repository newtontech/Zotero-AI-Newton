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
      "docs/vendor/**", // Third-party vendor libraries
      "docs/js/**", // Documentation site JavaScript files (contain JSX)
    ],
  },
];
