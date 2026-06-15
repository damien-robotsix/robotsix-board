import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["src/robotsix_board/static/board.js"],
      reporter: ["text", "text-summary"],
      // Ratcheting baseline floor — raise toward 100% over time.
      // The ratchet must only ever increase. See AGENT.md.
      thresholds: {
        lines: 70,
        functions: 60,
        branches: 50,
        statements: 70,
      },
    },
  },
});
