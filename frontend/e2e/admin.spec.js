import { test, expect } from "@playwright/test";
import { mockAuthenticatedApp, visitProtected } from "./helpers.js";

test("tenant users cannot access the super-admin pricing screen", async ({ page }) => {
    await mockAuthenticatedApp(page);
    await visitProtected(page, "/app/admin/pricing");
    await expect(page).toHaveURL(/\/403$/);
    await expect(page.getByRole("heading", { name: /forbidden/i })).toBeVisible();
});

test("super-admin dashboard is a platform control center, not a tenant dashboard", async ({ page }) => {
    await mockAuthenticatedApp(page, { role: "SUPER_ADMIN" });
    await visitProtected(page, "/dashboard");

    await expect(page).toHaveURL(/\/dashboard\/admin$/);
    await expect(page.getByRole("heading", { name: "Platform control center" })).toBeVisible();
    await expect(page.getByText("Tenants tracked")).toBeVisible();
    await expect(page.getByText("2", { exact: true })).toBeVisible();
    await expect(page.getByText("Tenants with quota alerts")).toBeVisible();
    await expect(page.getByText("1", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tenant management", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Pricing", exact: true })).toBeVisible();
    await expect(page.getByText("Not yet available in this deployment")).toBeVisible();

    await expect(page.getByRole("link", { name: "Usage & quotas" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Invoices" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "API keys" })).toHaveCount(0);
});

test("super-admins are redirected away from tenant-scoped configuration pages", async ({ page }) => {
    await mockAuthenticatedApp(page, { role: "SUPER_ADMIN" });
    await visitProtected(page, "/dashboard/quotas");
    await expect(page).toHaveURL(/\/dashboard\/admin$/);
});

test("super admins can update global pricing", async ({ page }) => {
    const state = await mockAuthenticatedApp(page, { role: "SUPER_ADMIN" });
    await visitProtected(page, "/app/admin/pricing");
    await expect(page.getByRole("heading", { name: "Global Pricing Administration" })).toBeVisible();

    await page.locator('input[type="number"]').nth(0).fill("0.0035");
    await page.locator('input[type="number"]').nth(1).fill("0.006");
    await page.getByRole("button", { name: "Update Global Pricing" }).click();

    await expect(page.getByText("Global pricing updated successfully.")).toBeVisible();
    const update = state.calls.find((call) => call.path === "/api/v1/admin/pricing" && call.method === "PUT");
    expect(JSON.parse(update.postData)).toEqual({ pricePer1kTokens: 0.0035, pricePer1kApiCalls: 0.006 });
});

test("tenant management lists platform quota status without offering fake impersonation", async ({ page }) => {
    await mockAuthenticatedApp(page, { role: "SUPER_ADMIN" });
    await visitProtected(page, "/dashboard/admin/tenants");

    await expect(page.getByRole("heading", { name: "Tenant Management" })).toBeVisible();
    await expect(page.getByText("tenantB")).toBeVisible();
    await expect(page.getByText("Impersonate")).toHaveCount(0);
});

test("quota hard-cap activation requires confirmation before saving", async ({ page }) => {
    const state = await mockAuthenticatedApp(page);
    await visitProtected(page, "/dashboard/quotas");
    await page.getByLabel("Enable Hard Cap (Block requests when quota is exceeded)").check();
    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByRole("heading", { name: "Confirm Hard Cap Enforcement" })).toBeVisible();
    expect(state.calls.some((call) => call.method === "PUT" && call.path.endsWith("/quota/config"))).toBe(false);

    await page.getByRole("button", { name: "Confirm & Enable" }).click();
    await expect(page.getByText("Quota configuration updated successfully.")).toBeVisible();
    const update = state.calls.find((call) => call.method === "PUT" && call.path.endsWith("/quota/config"));
    expect(JSON.parse(update.postData).hardCapEnabled).toBe(true);
});

test("quota hard-cap confirmation can be cancelled without updating", async ({ page }) => {
    const state = await mockAuthenticatedApp(page);
    await visitProtected(page, "/dashboard/quotas");
    await page.getByLabel("Enable Hard Cap (Block requests when quota is exceeded)").check();
    await page.getByRole("button", { name: "Save Changes" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByRole("heading", { name: "Confirm Hard Cap Enforcement" })).toHaveCount(0);
    expect(state.calls.some((call) => call.method === "PUT" && call.path.endsWith("/quota/config"))).toBe(false);
});
