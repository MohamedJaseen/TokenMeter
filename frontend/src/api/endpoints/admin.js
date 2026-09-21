import apiClient from "../client";

export async function fetchAdminPricing() {
    const res = await apiClient.get(`/api/v1/admin/pricing`);
    return res.data;
}

export async function updateAdminPricing(data) {
    const res = await apiClient.put(`/api/v1/admin/pricing`, data);
    return res.data;
}

export async function fetchAdminTenants() {
    const res = await apiClient.get(`/api/v1/admin/tenants`);
    return res.data;
}
