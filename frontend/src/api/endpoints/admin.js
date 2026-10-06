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

export async function createAdminTenant(data) {
    const res = await apiClient.post("/api/v1/admin/tenants", data);
    return res.data;
}

export async function fetchAdminTenant(tenantId) {
    const res = await apiClient.get(`/api/v1/admin/tenants/${encodeURIComponent(tenantId)}`);
    return res.data;
}

export async function updateAdminTenantStatus(tenantId, status) {
    const res = await apiClient.patch(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/status`,
        { status },
    );
    return res.data;
}

export async function updateAdminTenant(tenantId, data) {
    const res = await apiClient.patch(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}`,
        data,
    );
    return res.data;
}

export async function updateAdminTenantQuota(tenantId, data) {
    const res = await apiClient.put(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/quota`,
        data,
    );
    return res.data;
}

export async function resetAdminTenantQuota(tenantId) {
    const res = await apiClient.post(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/quota/reset`,
    );
    return res.data;
}

export async function createAdminTenantApiKey(tenantId, label) {
    const res = await apiClient.post(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/api-keys`,
        { label },
    );
    return res.data;
}

export async function revokeAdminTenantApiKey(tenantId, keyId) {
    const res = await apiClient.delete(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/api-keys/${keyId}`,
    );
    return res.data;
}

export async function fetchAdminInvoices({ tenantId, paymentStatus } = {}) {
    const res = await apiClient.get("/api/v1/admin/invoices", {
        params: {
            ...(tenantId ? { tenantId } : {}),
            ...(paymentStatus ? { paymentStatus } : {}),
        },
    });
    return res.data;
}

export async function generateAdminInvoice(data) {
    const res = await apiClient.post("/api/v1/admin/invoices", data);
    return res.data;
}

export async function updateAdminInvoiceStatus(invoiceId, paymentStatus) {
    const res = await apiClient.patch(
        `/api/v1/admin/invoices/${invoiceId}/status`,
        { paymentStatus },
    );
    return res.data;
}

export async function searchAdminUsageEvents(filters = {}) {
    const res = await apiClient.get("/api/v1/admin/usage-events", {
        params: Object.fromEntries(
            Object.entries(filters).filter(([, value]) => value !== "" && value != null),
        ),
    });
    return res.data;
}
