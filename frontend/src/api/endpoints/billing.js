import apiClient from "../client";

export async function fetchInvoices(tenantId) {
    const res = await apiClient.get(`/api/v1/tenants/${tenantId}/invoice`);
    return res.data;
}

export async function fetchInvoiceDetail(tenantId, invoiceId) {
    const res = await apiClient.get(`/api/v1/tenants/${tenantId}/invoice/${invoiceId}`);
    return res.data;
}
