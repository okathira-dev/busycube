import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/**/*.test.{ts,tsx}",
      "scripts/**/*.test.ts",
      "worker/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
    },
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
