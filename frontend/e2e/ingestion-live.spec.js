import { test, expect } from "@playwright/test";

const apiURL = process.env.E2E_API_URL || "http://localhost:8090";
const live = process.env.E2E_LIVE_API === "true";

test.describe("live ingestion contract (requires running gateway, demo and Redis)", () => {
    test.skip(!live, "Set E2E_LIVE_API=true to run against a live local or deployed API.");

    test("accepts one valid event and marks subsequent deliveries as duplicates", async ({ request }) => {
        const eventId = `pw-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const payload = {
            eventId,
            tenantId: process.env.TEST_TENANT_ID || "tenantA",
            metricName: "llm_tokens",
            units: 100,
            timestamp: new Date().toISOString(),
        };
        const first = await request.post(`${apiURL}/metering/usage`, { data: payload });
        expect(first.status()).toBe(202);
        expect(await first.json()).toMatchObject({ status: "QUEUED", eventId });

        const duplicate = await request.post(`${apiURL}/metering/usage`, { data: payload });
        expect(duplicate.status()).toBe(202);
        expect(await duplicate.json()).toMatchObject({ status: "DUPLICATE_IGNORED", eventId });
    });

    test("rejects missing required ingestion fields", async ({ request }) => {
        const response = await request.post(`${apiURL}/metering/usage`, {
            data: { eventId: `pw-invalid-${Date.now()}`, tenantId: "tenantA", metricName: "llm_tokens" },
        });
        expect(response.status()).toBe(400);
    });

    test("rejects zero or negative usage units", async ({ request }) => {
        const response = await request.post(`${apiURL}/metering/usage`, {
            data: {
                eventId: `pw-invalid-units-${Date.now()}`,
                tenantId: "tenantA",
                metricName: "llm_tokens",
                units: 0,
                timestamp: new Date().toISOString(),
            },
        });
        expect(response.status()).toBe(400);
    });
});
