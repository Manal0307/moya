import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5174",
    browserName: "chromium",
  },
  reporter: "list",
});
