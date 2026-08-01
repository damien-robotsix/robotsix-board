import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/robotsix_board/e2e",
  webServer: {
    command: "python3 -m http.server 8080",
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:8080",
  },
});
