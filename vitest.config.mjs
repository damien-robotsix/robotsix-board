import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["./tests/robotsix_board/setup.js"],
    include: ["tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["src/robotsix_board/static/board.js"],
      reporter: ["text", "text-summary"],
      // Fleet-wide 80 coverage floor — see AGENT.md.
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
