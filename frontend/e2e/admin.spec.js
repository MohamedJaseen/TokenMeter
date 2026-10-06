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
    await expect(page.getByText("Total tenants")).toBeVisible();
    await expect(page.getByText("2", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Tenants with quota alerts")).toBeVisible();
    await expect(page.getByText("1", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Tenant management", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Pricing", exact: true })).toBeVisible();
    await expect(page.getByText(/do not yet have platform admin APIs/)).toBeVisible();

    await expect(page.getByRole("link", { name: "Usage & quotas" })).toHaveCount(0);
    await expect(page.locator('a[href="/dashboard/billing"]')).toHaveCount(0);
    await expect(page.locator('a[href="/dashboard/api-keys"]')).toHaveCount(0);
    await expect(page.locator('a[href="/dashboard/admin/invoices"]')).toHaveCount(2);
});

test("super-admins are redirected away from tenant-scoped configuration pages", async ({ page }) => {
    await mockAuthenticatedApp(page, { role: "SUPER_ADMIN" });
    await visitProtected(page, "/dashboard/quotas");
    await expect(page).toHaveURL(/\/dashboard\/admin$/);
});

test("mobile workspace navigation opens as a drawer and follows the selected route", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockAuthenticatedApp(page);
    await visitProtected(page, "/dashboard");

    await page.getByRole("button", { name: "Open navigation menu" }).click();
    const navigation = page.getByRole("navigation", { name: "Workspace" });
    await expect(navigation).toBeVisible();
    await navigation.getByRole("link", { name: "Usage & quotas" }).click();
    await expect(page).toHaveURL(/\/dashboard\/quotas$/);
    await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeVisible();
});

test("admin usage explorer fits common breakpoints without overflow or runtime errors", async ({ page }) => {
    const runtimeErrors = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => {
        if (message.type() === "error") runtimeErrors.push(message.text());
    });
    await mockAuthenticatedApp(page, { role: "SUPER_ADMIN" });

    for (const width of [390, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await visitProtected(page, "/dashboard/admin/usage");
        await expect(page.getByRole("heading", { name: "Usage / metering explorer" })).toBeVisible();
        const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(pageWidth).toBeLessThanOrEqual(width);
    }
    expect(runtimeErrors).toEqual([]);
});

test("super admins can update global pricing", async ({ page }) => {
    const state = await mockAuthenticatedApp(page, { role: "SUPER_ADMIN" });
    await visitProtected(page, "/app/admin/pricing");
    await expect(page.getByRole("heading", { name: "Global pricing" })).toBeVisible();

    await page.locator('input[type="number"]').nth(0).fill("0.0035");
    await page.locator('input[type="number"]').nth(1).fill("0.006");
    await page.getByRole("button", { name: "Update global pricing" }).click();

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

test("super-admin can create a tenant and receives its initial API secret once", async ({ page }) => {
    const state = await mockAuthenticatedApp(page, { role: "SUPER_ADMIN" });
    await visitProtected(page, "/dashboard/admin/tenants");
    await page.getByRole("button", { name: "Create tenant" }).click();
    await page.getByLabel("Tenant ID").fill("new-tenant");
    await page.getByLabel("Organization name").fill("New Tenant");
    await page.getByLabel("Contact email").fill("owner@example.test");
    await page.getByLabel("Initial admin username").fill("new-owner");
    await page.getByLabel(/Temporary password/).fill("long-enough-password");
    await page.getByLabel("Plan name").fill("PRO");
    await page.getByRole("button", { name: "Create tenant" }).last().click();

    await expect(page.getByText("Tenant and initial administrator created.")).toBeVisible();
    await expect(page.getByText("sec_live_admin_once")).toBeVisible();
    const creation = state.calls.find((call) => call.method === "POST" && call.path === "/api/v1/admin/tenants");
    expect(JSON.parse(creation.postData)).toMatchObject({
        tenantId: "new-tenant",
        tenantName: "New Tenant",
        adminUsername: "new-owner",
        planName: "PRO",
    });
});

test("super-admin can review tenant details and update its plan and quota", async ({ page }) => {
    const state = await mockAuthenticatedApp(page, { role: "SUPER_ADMIN" });
    await visitProtected(page, "/dashboard/admin/tenants");
    await page.getByRole("button", { name: "Manage" }).first().click();
    await expect(page.getByRole("heading", { name: "Tenant Alpha" })).toBeVisible();
    await expect(page.getByText("30-day LLM tokens")).toBeVisible();
    await page.getByLabel("Plan name").fill("ENTERPRISE");
    await page.getByLabel("Monthly unit limit").last().fill("25000");
    await page.getByRole("button", { name: "Save plan & quota" }).click();

    await expect(page.getByText("Plan and quota configuration saved.")).toBeVisible();
    const quotaUpdate = state.calls.find((call) => call.method === "PUT" && call.path === "/api/v1/admin/tenants/tenantA/quota");
    expect(JSON.parse(quotaUpdate.postData)).toMatchObject({ tierName: "ENTERPRISE", monthlyUnitLimit: 25000 });
});

test("super-admin can update a tenant organization profile", async ({ page }) => {
    const state = await mockAuthenticatedApp(page, { role: "SUPER_ADMIN" });
    await visitProtected(page, "/dashboard/admin/tenants");
    await page.getByRole("button", { name: "Manage" }).first().click();
    await page.getByLabel("Organization name").last().fill("Tenant Alpha Updated");
    await page.getByLabel("Contact email").last().fill("updated@example.test");
    await page.getByRole("button", { name: "Save profile" }).click();

    await expect(page.getByText("Tenant profile updated.")).toBeVisible();
    const update = state.calls.find((call) =>
        call.method === "PATCH" && call.path === "/api/v1/admin/tenants/tenantA");
    expect(JSON.parse(update.postData)).toEqual({
        tenantName: "Tenant Alpha Updated",
        contactEmail: "updated@example.test",
    });
});

test("super-admin can suspend a tenant and can confirm a quota reset", async ({ page }) => {
    const state = await mockAuthenticatedApp(page, { role: "SUPER_ADMIN" });
    await visitProtected(page, "/dashboard/admin/tenants");
    await page.getByRole("button", { name: "Suspend" }).first().click();
    await expect.poll(() => state.calls.some((call) =>
        call.method === "PATCH" && call.path === "/api/v1/admin/tenants/tenantA/status"
        && JSON.parse(call.postData).status === "SUSPENDED")).toBe(true);

    await page.getByRole("button", { name: "Manage" }).first().click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Reset current-month quota" }).click();
    await expect.poll(() => state.calls.some((call) =>
        call.method === "POST" && call.path === "/api/v1/admin/tenants/tenantA/quota/reset")).toBe(true);
});

test("super-admin can manage a tenant API key from tenant details", async ({ page }) => {
    const state = await mockAuthenticatedApp(page, { role: "SUPER_ADMIN" });
    await visitProtected(page, "/dashboard/admin/tenants");
    await page.getByRole("button", { name: "Manage" }).first().click();
    await expect(page.getByText("Production")).toBeVisible();
    await page.getByRole("button", { name: "Create key" }).click();

    await expect(page.getByText("sec_live_admin_created_once")).toBeVisible();
    expect(state.calls.some((call) =>
        call.method === "POST" && call.path === "/api/v1/admin/tenants/tenantA/api-keys")).toBe(true);
});

test("super-admin can filter invoices, update payment status, and export", async ({ page }) => {
    const state = await mockAuthenticatedApp(page, { role: "SUPER_ADMIN" });
    await visitProtected(page, "/dashboard/admin/invoices");
    await expect(page.getByText("Platform billing & invoices")).toBeVisible();
    await expect(page.getByText("Tenant Bravo", { exact: true })).toBeVisible();
    await page.getByLabel("Payment status").selectOption("PENDING");
    await expect.poll(() => state.calls.some((call) =>
        call.path === "/api/v1/admin/invoices" && call.method === "GET" && call.url?.includes("paymentStatus=PENDING"))).toBe(true);
    await page.getByLabel("Update status for invoice inv-b").selectOption("PAID");
    await expect.poll(() => state.calls.some((call) =>
        call.method === "PATCH" && call.path === "/api/v1/admin/invoices/inv-b/status")).toBe(true);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download CSV" }).click();
    expect((await download).suggestedFilename()).toBe("tokenmeter-invoices.csv");
});

test("super-admin can inspect processed metering events across tenants", async ({ page }) => {
    const state = await mockAuthenticatedApp(page, { role: "SUPER_ADMIN" });
    await visitProtected(page, "/dashboard/admin/usage");
    await expect(page.getByText("evt-admin-1")).toBeVisible();
    await expect(page.getByText("llm_tokens")).toBeVisible();
    await expect(page.getByText("2,000 ms")).toBeVisible();
    await page.getByPlaceholder("e.g. llm_tokens").fill("api_calls");
    await page.getByRole("button", { name: "Search events" }).click();
    await expect.poll(() => state.calls.some((call) =>
        call.path === "/api/v1/admin/usage-events" && call.url?.includes("metricName=api_calls"))).toBe(true);
});

test("quota hard-cap activation requires confirmation before saving", async ({ page }) => {
    const state = await mockAuthenticatedApp(page);
    await visitProtected(page, "/dashboard/quotas");
    await page.getByLabel("Enable Hard Cap (Block requests when quota is exceeded)").check();
    await page.getByRole("button", { name: "Save changes" }).click();

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
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByRole("heading", { name: "Confirm Hard Cap Enforcement" })).toHaveCount(0);
    expect(state.calls.some((call) => call.method === "PUT" && call.path.endsWith("/quota/config"))).toBe(false);
});
