import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "bun:test": "vitest",
    },
  },
  test: {
    exclude: ["**/node_modules/**", "**/__snapshots__/**"],
    resolveSnapshotPath: (testPath, snapExtension) =>
      testPath.replace(/\.test\.ts$/, `.vitest${snapExtension}`),
  },
});
