import apiClient from "../client";

export async function fetchApiKeys(tenantId) {
    const res = await apiClient.get(`/api/v1/tenants/${tenantId}/api-keys`);
    return res.data;
}

export async function createApiKey(tenantId, label) {
    const res = await apiClient.post(`/api/v1/tenants/${tenantId}/api-keys`, { label });
    return res.data;
}

export async function revokeApiKey(tenantId, keyId) {
    const res = await apiClient.delete(`/api/v1/tenants/${tenantId}/api-keys/${keyId}`);
    return res.data;
}
