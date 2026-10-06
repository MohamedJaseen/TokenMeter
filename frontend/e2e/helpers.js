import { expect } from "@playwright/test";

export const tenantId = "tenantA";
export const refreshToken = "e2e-refresh-token";

export function accessToken(role = "TENANT_USER") {
    const claims = Buffer.from(JSON.stringify({
        sub: "e2e-user",
        tenant_id: tenantId,
        roles: [role],
        exp: Math.floor(Date.now() / 1000) + 3600,
    })).toString("base64url");
    return `e30.${claims}.e2e-signature`;
}

export async function mockAuthenticatedApp(page, { role = "TENANT_USER" } = {}) {
    const state = {
        apiKeys: [{ id: "key-1", prefix: "sec_live_abc", label: "Production", createdAt: "2026-10-01T00:00:00Z" }],
        quotaConfig: {
            tierName: "Growth",
            monthlyUnitLimit: 10000,
            hardCapEnabled: false,
            alertThresholdPercent: 80,
            unitRateDollars: 0.01,
        },
        pricing: { pricePer1kTokens: 0.002, pricePer1kApiCalls: 0.005 },
        tenants: [
            { tenantId, tenantName: "Tenant Alpha", contactEmail: "a@example.test", tenantStatus: "ACTIVE", tierName: "Growth", monthlyLimit: 10000, currentUsage: 420, usagePercentage: 4.2, alertThresholdPercent: 80, hardCapEnabled: false, quotaStatus: "NORMAL" },
            { tenantId: "tenantB", tenantName: "Tenant Bravo", contactEmail: "b@example.test", tenantStatus: "ACTIVE", tierName: "Pro", monthlyLimit: 5000, currentUsage: 4600, usagePercentage: 92, alertThresholdPercent: 80, hardCapEnabled: true, quotaStatus: "WARNING" },
        ],
        calls: [],
    };
    const token = accessToken(role);

    await page.addInitScript((storedRefreshToken) => {
        localStorage.setItem("refresh_token", storedRefreshToken);
    }, refreshToken);

    await page.route("**/auth/refresh", async (route) => {
        await route.fulfill({
            json: { accessToken: token, refreshToken: "e2e-rotated-refresh-token" },
        });
    });

    await page.route("**/api/v1/**", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const path = url.pathname;
        const method = request.method();
        state.calls.push({
            path,
            url: request.url(),
            method,
            headers: request.headers(),
            postData: request.postData(),
            range: url.searchParams.get("range"),
        });

        if (path.endsWith("/usage/realtime")) {
            await route.fulfill({
                status: 200,
                contentType: "text/event-stream",
                body: 'data: {"type":"connected","tenantId":"tenantA","eventId":null,"metricName":null,"units":null,"timestamp":"2026-10-06T10:00:00Z"}\n\n' +
                    'data: {"type":"usage","eventId":"evt-live-1","tenantId":"tenantA","metricName":"llm_tokens","units":17,"timestamp":"2026-10-06T10:00:01Z"}\n\n',
            });
        } else if (path === "/api/v1/tenants/tenantA/usage") {
            await route.fulfill({ json: { tenantId: "tenantA", totalUsage: 6834, apiCallsCount: 1234, llmTokensCount: 5600, hourlyUsage: [{ bucketHour: "2026-10-06T10:00:00Z", units: 20 }] } });
        } else if (path === "/api/v1/tenants/tenantA/quota") {
            await route.fulfill({ json: { currentUsage: 420, monthlyLimit: 1000, usagePercentage: 42, status: "NORMAL", tierName: "Growth", alertThresholdPercent: 80, hardCapEnabled: false } });
        } else if (path === "/api/v1/tenants/tenantA/invoice") {
            await route.fulfill({ json: [{ invoiceId: "inv-2026-10", billingPeriodStart: "2026-10-01", billingPeriodEnd: "2026-10-31", totalUnitsConsumed: 420, totalAmountBilled: 12.5, paymentStatus: "PAID", createdAt: "2026-10-02T00:00:00Z" }] });
        } else if (path === "/api/v1/tenants/tenantA/quota/config" && method === "GET") {
            await route.fulfill({ json: state.quotaConfig });
        } else if (path === "/api/v1/tenants/tenantA/quota/config" && method === "PUT") {
            state.quotaConfig = JSON.parse(request.postData() || "{}");
            await route.fulfill({ json: state.quotaConfig });
        } else if (path === "/api/v1/tenants/tenantA/api-keys" && method === "GET") {
            await route.fulfill({ json: state.apiKeys });
        } else if (path === "/api/v1/tenants/tenantA/api-keys" && method === "POST") {
            const body = JSON.parse(request.postData() || "{}");
            state.apiKeys.push({ id: "key-created", prefix: "sec_new_xyz", label: body.label, createdAt: "2026-10-06T00:00:00Z" });
            await route.fulfill({ json: { secret: "sec_new_one-time-secret" } });
        } else if (path.startsWith("/api/v1/tenants/tenantA/api-keys/") && method === "DELETE") {
            state.apiKeys = state.apiKeys.filter((key) => key.id !== path.split("/").pop());
            await route.fulfill({ json: { status: "REVOKED" } });
        } else if (path === "/api/v1/admin/pricing" && method === "GET") {
            await route.fulfill({ json: state.pricing });
        } else if (path === "/api/v1/admin/pricing" && method === "PUT") {
            state.pricing = JSON.parse(request.postData() || "{}");
            await route.fulfill({ json: state.pricing });
        } else if (path === "/api/v1/admin/tenants" && method === "GET") {
            await route.fulfill({ json: state.tenants });
        } else if (path === "/api/v1/admin/tenants" && method === "POST") {
            state.tenants.push({ tenantId: "new-tenant", tenantName: "New Tenant", contactEmail: "owner@example.test", tenantStatus: "ACTIVE", tierName: "PRO", monthlyLimit: 10000, currentUsage: 0, quotaStatus: "NORMAL" });
            await route.fulfill({ status: 201, json: { tenantId: "new-tenant", secret: "sec_live_admin_once" } });
        } else if (path.startsWith("/api/v1/admin/tenants/") && method === "GET") {
            const detailTenantId = decodeURIComponent(path.split("/").pop());
            const tenant = state.tenants.find((item) => item.tenantId === detailTenantId);
            await route.fulfill({ json: {
                tenant,
                usage: { apiCallsCount: 20, llmTokensCount: 400, totalUsage: 420, hourlyUsage: [] },
                quota: { tenantId: detailTenantId, tier: tenant.tierName, monthlyLimit: tenant.monthlyLimit, currentUsage: tenant.currentUsage, usagePercentage: 4.2, alertThresholdPercent: 80, hardCapEnabled: false, status: "NORMAL" },
                quotaConfig: { tenantId: detailTenantId, tierName: tenant.tierName, monthlyUnitLimit: tenant.monthlyLimit, hardCapEnabled: false, alertThresholdPercent: 80, unitRateDollars: 0.01 },
                invoices: [],
                apiKeys: state.apiKeys,
            } });
        } else if (path === "/api/v1/admin/tenants/tenantA" && method === "PATCH") {
            const profile = JSON.parse(request.postData() || "{}");
            const tenant = state.tenants.find((item) => item.tenantId === tenantId);
            Object.assign(tenant, profile);
            await route.fulfill({ json: { ...tenant } });
        } else if (path === "/api/v1/admin/tenants/tenantA/status" && method === "PATCH") {
            await route.fulfill({ json: { tenantId, tenantStatus: JSON.parse(request.postData() || "{}").status } });
        } else if (path === "/api/v1/admin/tenants/tenantA/quota" && method === "PUT") {
            await route.fulfill({ json: { tenantId, ...JSON.parse(request.postData() || "{}") } });
        } else if (path === "/api/v1/admin/tenants/tenantA/quota/reset" && method === "POST") {
            await route.fulfill({ status: 204, body: "" });
        } else if (path === "/api/v1/admin/tenants/tenantA/api-keys" && method === "POST") {
            await route.fulfill({ status: 201, json: { tenantId, keyId: "admin-key", secret: "sec_live_admin_created_once" } });
        } else if (path === "/api/v1/admin/tenants/tenantA/api-keys/admin-key" && method === "DELETE") {
            await route.fulfill({ status: 204, body: "" });
        } else if (path === "/api/v1/admin/invoices" && method === "GET") {
            await route.fulfill({ json: [
                { invoiceId: "inv-a", tenantId, tenantName: "Tenant Alpha", billingPeriodStart: "2026-10-01", billingPeriodEnd: "2026-10-31", totalUnitsConsumed: 420, totalAmountBilled: 12.5, paymentStatus: "PAID", createdAt: "2026-10-02T00:00:00Z" },
                { invoiceId: "inv-b", tenantId: "tenantB", tenantName: "Tenant Bravo", billingPeriodStart: "2026-10-01", billingPeriodEnd: "2026-10-31", totalUnitsConsumed: 120, totalAmountBilled: 5, paymentStatus: "PENDING", createdAt: "2026-10-02T00:00:00Z" },
            ] });
        } else if (path === "/api/v1/admin/invoices" && method === "POST") {
            await route.fulfill({ json: { invoiceId: "inv-new", ...JSON.parse(request.postData() || "{}"), totalAmountBilled: 2, totalUnitsConsumed: 10, paymentStatus: "PENDING" } });
        } else if (path.startsWith("/api/v1/admin/invoices/") && method === "PATCH") {
            await route.fulfill({ json: { invoiceId: path.split("/")[5], paymentStatus: JSON.parse(request.postData() || "{}").paymentStatus } });
        } else if (path === "/api/v1/admin/usage-events") {
            await route.fulfill({ json: [
                { eventId: "evt-admin-1", tenantId, metricName: "llm_tokens", units: 17, eventTimestamp: "2026-10-06T10:00:00Z", processedAt: "2026-10-06T10:00:02Z", latencyMillis: 2000, processingStatus: "PROCESSED", duplicate: false },
            ] });
        } else if (path === "/api/v1/ai/generate" && method === "POST") {
            await route.fulfill({ json: { text: "Metered answer", model: "test-model", inputTokens: 8, outputTokens: 13, totalTokens: 21 } });
        } else {
            await route.fulfill({ status: 200, json: {} });
        }
    });

    return state;
}

export async function visitProtected(page, path) {
    await page.goto(path);
    await expect(page.getByText("Loading session...")).toHaveCount(0);
}
