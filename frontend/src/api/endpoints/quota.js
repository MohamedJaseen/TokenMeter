import apiClient from "../client";

export async function fetchQuota(tenantId) {
    const res = await apiClient.get(`/api/v1/tenants/${tenantId}/quota`);
    return res.data;
}

export async function fetchQuotaConfig(tenantId) {
    const res = await apiClient.get(`/api/v1/tenants/${tenantId}/quota/config`);
    return res.data;
}

export async function updateQuotaConfig(tenantId, data) {
    const res = await apiClient.put(`/api/v1/tenants/${tenantId}/quota/config`, data);
    return res.data;
}
