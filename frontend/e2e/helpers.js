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
        } else if (path === "/api/v1/admin/tenants") {
            await route.fulfill({ json: [
                { tenantId, tierName: "Growth", monthlyLimit: 10000, currentUsage: 420, usagePercentage: 4.2, alertThresholdPercent: 80, hardCapEnabled: false, status: "NORMAL" },
                { tenantId: "tenantB", tierName: "Pro", monthlyLimit: 5000, currentUsage: 4600, usagePercentage: 92, alertThresholdPercent: 80, hardCapEnabled: true, status: "WARNING" },
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
