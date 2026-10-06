import { test, expect } from "@playwright/test";
import { mockAuthenticatedApp, visitProtected } from "./helpers.js";

test("API key screen creates a key and reveals the secret once", async ({ page }) => {
    const state = await mockAuthenticatedApp(page);
    await visitProtected(page, "/dashboard/api-keys");
    await expect(page.getByText("Production")).toBeVisible();
    await page.getByRole("button", { name: "Create New API Key" }).click();
    await page.getByPlaceholder("e.g., Production Backend").fill("Playwright key");
    await page.getByRole("button", { name: "Generate" }).click();

    await expect(page.getByText("Save this secret now!")).toBeVisible();
    await expect(page.getByText("sec_new_one-time-secret")).toBeVisible();
    expect(state.calls.some((call) => call.method === "POST" && call.path.endsWith("/api-keys") && JSON.parse(call.postData).label === "Playwright key")).toBe(true);
});

test("API key screen revokes a key", async ({ page }) => {
    const state = await mockAuthenticatedApp(page);
    await visitProtected(page, "/dashboard/api-keys");
    await page.getByRole("button", { name: "Revoke" }).click();

    await expect.poll(() => state.calls.some((call) => call.method === "DELETE" && call.path.endsWith("/api-keys/key-1"))).toBe(true);
});

test("playground sends the prompt with the tenant key and renders token usage", async ({ page }) => {
    const state = await mockAuthenticatedApp(page);
    await page.goto("/playground");
    await page.locator('input[type="password"]').fill("sec_test_playground");
    await page.getByPlaceholder("Message the metering assistant...").fill("Count these tokens");
    await page.getByRole("button", { name: "Send prompt" }).click();

    await expect(page.getByText("Metered answer")).toBeVisible();
    await expect(page.getByText("21 tokens")).toBeVisible();
    const generation = state.calls.find((call) => call.path === "/api/v1/ai/generate");
    expect(generation.method).toBe("POST");
    expect(generation.headers["x-api-key"]).toBe("sec_test_playground");
    expect(JSON.parse(generation.postData)).toEqual({ prompt: "Count these tokens" });
});

test("playground displays invalid API key responses", async ({ page }) => {
    await mockAuthenticatedApp(page);
    await page.route("**/api/v1/ai/generate", async (route) => {
        await route.fulfill({ status: 401, json: { message: "Invalid or revoked key" } });
    });
    await page.goto("/playground");
    await page.locator('input[type="password"]').fill("sec_bad_key");
    await page.getByPlaceholder("Message the metering assistant...").fill("Hello");
    await page.getByRole("button", { name: "Send prompt" }).click();

    await expect(page.getByText("Invalid or revoked key")).toBeVisible();
});

test("telemetry displays accepted events from the SSE stream", async ({ page }) => {
    await mockAuthenticatedApp(page);
    await visitProtected(page, "/dashboard/realtime");
    await expect(page.getByText("evt-live-1")).toBeVisible();
    await expect(page.getByText("llm_tokens")).toBeVisible();
    await expect(page.getByRole("cell", { name: "17", exact: true })).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(1);
});
