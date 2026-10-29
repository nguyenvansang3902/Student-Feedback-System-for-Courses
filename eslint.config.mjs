import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  prettier,
  globalIgnores([
    ".next/**",
    ".next-auth/**",
    ".next-demo/**",
    ".next-week5/**",
    ".next-week6/**",
    ".next-week7/**",
    ".next-week7-settings/**",
    ".next-week8/**",
    "out/**",
    "build/**",
    "src/generated/**",
    "next-env.d.ts",
  ]),
]);
