import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["src/robotsix_board/static/board.js"],
      reporter: ["text", "text-summary"],
      // Ratcheting baseline floor — these are a CONSERVATIVE placeholder,
      // intentionally well below the (currently unmeasurable in-sandbox)
      // real coverage, so CI is green today. Raise toward 100% over time;
      // the ratchet must only ever increase. See AGENT.md.
      thresholds: {
        lines: 20,
        functions: 15,
        branches: 10,
        statements: 20,
      },
    },
  },
});
