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
    await expect(page.getByText("PAID", { exact: true })).toBeVisible();
});

test("billing displays configured QR and submits payment claim for admin verification", async ({ page }) => {
    await mockAuthenticatedApp(page);
    const state = [];
    let paymentStatus = "PENDING";
    await page.route("**/api/v1/tenants/tenantA/invoice", async (route) => {
        await route.fulfill({ json: [{
            invoiceId: "11111111-1111-4111-8111-111111111111",
            billingPeriodStart: "2026-10-01",
            billingPeriodEnd: "2026-10-31",
            totalUnitsConsumed: 420,
            totalAmountBilled: 12.5,
            paymentStatus,
            createdAt: "2026-10-02T00:00:00Z",
        }] });
    });
    await page.route("**/payment-details", async (route) => {
        await route.fulfill({ json: {
            invoiceId: "11111111-1111-4111-8111-111111111111",
            amount: 12.5,
            currency: "INR",
            qrImageUrl: "https://payments.example.test/gpay-qr.png",
            paymentStatus: "PENDING",
        } });
    });
    await page.route("**/payment-submission", async (route) => {
        state.push({ method: route.request().method(), body: route.request().postData() });
        paymentStatus = "PAYMENT_SUBMITTED";
        await route.fulfill({ json: {
            invoiceId: "11111111-1111-4111-8111-111111111111",
            paymentStatus: "PAYMENT_SUBMITTED",
            paymentSubmittedAt: "2026-10-06T12:00:00Z",
        } });
    });
    await visitProtected(page, "/dashboard/billing");

    await page.getByRole("button", { name: /Pay ₹12\.50/ }).click();
    await expect(page.getByRole("img", { name: "Configured Google Pay payment QR code" })).toHaveAttribute("src", "https://payments.example.test/gpay-qr.png");
    await page.getByRole("button", { name: "I’ve completed payment" }).click();
    await expect(page.getByText("AWAITING VERIFICATION", { exact: true })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("A Super Admin must verify the transfer");
    expect(state).toHaveLength(1);
    expect(state[0].method).toBe("POST");
});
