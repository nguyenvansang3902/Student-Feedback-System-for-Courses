import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
    coverage: {
      provider: "v8",
      include: [
        "src/server/services/**/*.ts",
        "src/server/policies/**/*.ts",
        "src/server/auth/**/*.ts",
      ],
      exclude: ["**/*types.ts", "**/*seed*.ts"],
      reporter: ["text-summary", "json", "json-summary", "html"],
      reportsDirectory: "coverage/week13",
      thresholds: { statements: 75, branches: 70, functions: 75, lines: 75 },
    },
  },
});
