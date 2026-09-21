import apiClient from "../client";

export async function fetchUsage(tenantId, range = "24h") {
    const res = await apiClient.get(`/api/v1/tenants/${tenantId}/usage`, {
        params: { range },
    });
    return res.data;
}
