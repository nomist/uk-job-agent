import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/integration/**/*.test.{ts,tsx}",
      "src/**/*.test.{ts,tsx}",
    ],
    setupFiles: ["tests/setup.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    // Integration tests share one SQLite test database file; running test
    // files concurrently would race on it.
    fileParallelism: false,
  },
});
