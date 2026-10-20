import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // `_name` marks values destructured only to omit them (e.g. DynamoDB key attributes).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    ".data/**",
    "next-env.d.ts",
    "cdk.out/**",
    "infra/**",
    // Claude Code worktrees (full checkouts with their own builds).
    ".claude/**",
  ]),
]);
