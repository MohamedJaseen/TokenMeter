import { test, expect } from "@playwright/test";
import { accessToken, mockAuthenticatedApp, refreshToken } from "./helpers.js";

test("guests are redirected to login when opening a protected dashboard page", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "MeterFlow Sign In" })).toBeVisible();
});

test("login stores refresh token and opens the dashboard", async ({ page }) => {
    const token = accessToken();
    let submitted;
    await page.route("**/auth/login", async (route) => {
        submitted = route.request().postDataJSON();
        await route.fulfill({ json: { accessToken: token, refreshToken } });
    });
    await page.route("**/api/v1/**", async (route) => {
        if (new URL(route.request().url()).pathname.endsWith("/usage/realtime")) {
            await route.fulfill({ status: 200, contentType: "text/event-stream", body: "" });
        } else {
            await route.fulfill({ json: new URL(route.request().url()).pathname.endsWith("/invoice") ? [] :
                new URL(route.request().url()).pathname.endsWith("/usage") ? { apiCallsCount: 0, llmTokensCount: 0, hourlyUsage: [] } :
                new URL(route.request().url()).pathname.endsWith("/quota") ? { currentUsage: 0, monthlyLimit: 1000, usagePercentage: 0, status: "NORMAL" } : {} });
        }
    });

    await page.goto("/login");
    await page.locator('input[type="text"]').fill("my-admin");
    await page.locator('input[type="password"]').fill("correct-horse");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    expect(submitted).toEqual({ username: "my-admin", password: "correct-horse" });
    await expect.poll(() => page.evaluate(() => localStorage.getItem("refresh_token"))).toBe(refreshToken);
});

test("login reports rejected credentials without leaving the form", async ({ page }) => {
    await page.route("**/auth/login", async (route) => {
        await route.fulfill({ status: 401, json: { message: "Invalid username or password" } });
    });
    await page.goto("/login");
    await page.locator('input[type="text"]').fill("unknown");
    await page.locator('input[type="password"]').fill("wrong-password");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("Invalid username or password")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
});

test("registration sends a normalized workspace and displays the one-time API key", async ({ page }) => {
    let registered;
    await page.route("**/auth/register", async (route) => {
        registered = route.request().postDataJSON();
        await route.fulfill({ status: 201, json: { tenantId: "acme-labs", apiKey: "sec_register_once" } });
    });

    await page.goto("/register");
    await page.locator('input[name="tenantName"]').fill("Acme Labs");
    await page.locator('input[name="username"]').fill("acme-admin");
    await page.locator('input[name="email"]').fill("admin@example.test");
    await page.locator('input[name="password"]').fill("password-123");
    await page.locator('input[name="confirmPassword"]').fill("password-123");
    await page.getByRole("button", { name: "Create Tenant" }).click();

    await expect(page.getByRole("heading", { name: "Workspace created" })).toBeVisible();
    await expect(page.getByText("sec_register_once")).toBeVisible();
    expect(registered).toEqual({
        tenantId: "acme-labs",
        tenantName: "Acme Labs",
        username: "acme-admin",
        email: "admin@example.test",
        password: "password-123",
    });
});

test("registration blocks mismatched passwords before calling the API", async ({ page }) => {
    let requestCount = 0;
    await page.route("**/auth/register", async (route) => {
        requestCount += 1;
        await route.fulfill({ status: 201, json: {} });
    });
    await page.goto("/register");
    await page.locator('input[name="tenantName"]').fill("Acme Labs");
    await page.locator('input[name="username"]').fill("acme-admin");
    await page.locator('input[name="password"]').fill("password-123");
    await page.locator('input[name="confirmPassword"]').fill("different-password");
    await page.getByRole("button", { name: "Create Tenant" }).click();

    await expect(page.getByText("Passwords do not match")).toBeVisible();
    expect(requestCount).toBe(0);
});

test("refresh-token rotation is persisted when loading an existing session", async ({ page }) => {
    const state = await mockAuthenticatedApp(page);
    await page.goto("/dashboard/api-keys");
    await expect(page.getByRole("heading", { name: "API Keys Management" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("refresh_token"))).toBe("e2e-rotated-refresh-token");
    expect(state.calls.some((call) => call.headers.authorization?.startsWith("Bearer "))).toBe(true);
});
