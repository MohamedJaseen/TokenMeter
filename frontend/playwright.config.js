import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:5173";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    reporter: [
        ["list"],
        ["html", { outputFolder: "artifacts/playwright-report", open: "never" }],
        ["json", { outputFile: "artifacts/results.json" }],
    ],
    outputDir: "artifacts/test-results",
    use: {
        baseURL,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: {
        command: "npm run dev -- --host 127.0.0.1",
        url: baseURL,
        env: { VITE_API_BASE: baseURL },
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
