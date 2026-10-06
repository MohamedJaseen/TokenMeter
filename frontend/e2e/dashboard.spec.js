import { test, expect } from "@playwright/test";
import { mockAuthenticatedApp, visitProtected } from "./helpers.js";

test("dashboard presents usage, token, quota and invoice metrics", async ({ page }) => {
    const state = await mockAuthenticatedApp(page);
    await visitProtected(page, "/dashboard");

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("1,234")).toBeVisible();
    await expect(page.getByText("5,600")).toBeVisible();
    await expect(page.getByText("42%", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Latest invoice")).toBeVisible();
    expect(state.calls.some((call) => call.path === "/api/v1/tenants/tenantA/usage" && call.headers.authorization?.startsWith("Bearer "))).toBe(true);
});

test("dashboard time-range controls request the selected interval", async ({ page }) => {
    const state = await mockAuthenticatedApp(page);
    await visitProtected(page, "/dashboard");
    await page.getByRole("button", { name: "7D" }).click();

    await expect.poll(() => state.calls.some((call) =>
        call.path === "/api/v1/tenants/tenantA/usage" && call.range === "7d"
    )).toBe(true);
});

test("dashboard shows the backend failure and exposes retry", async ({ page }) => {
    await mockAuthenticatedApp(page);
    await page.route("**/api/v1/tenants/tenantA/quota", async (route) => {
        await route.fulfill({ status: 503, json: { message: "Quota service unavailable" } });
    });
    await visitProtected(page, "/dashboard");

    await expect(page.getByText("Quota service unavailable")).toBeVisible();
    await expect(page.getByRole("button", { name: /retry/i })).toBeVisible();
});

test("billing page lists invoice totals and payment status", async ({ page }) => {
    await mockAuthenticatedApp(page);
    await visitProtected(page, "/dashboard/billing");

    await expect(page.getByRole("heading", { name: "Billing & invoices" })).toBeVisible();
    await expect(page.getByText("inv-2026-10")).toBeVisible();
    await expect(page.getByText("PAID")).toBeVisible();
    await expect(page.getByText("$12.50")).toBeVisible();
});
