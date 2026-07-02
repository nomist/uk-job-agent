import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  // TODO: add an import-boundary rule (e.g. eslint-plugin-boundaries) once
  // domain/application/infrastructure have real modules, so src/domain and
  // src/application can't import from src/app or src/infrastructure.
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Prisma client — not hand-written, not linted.
    "src/generated/**",
  ]),
]);

export default eslintConfig;
