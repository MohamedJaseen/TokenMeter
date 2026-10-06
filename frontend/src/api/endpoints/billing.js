import apiClient from "../client";

export async function fetchInvoices(tenantId) {
    const res = await apiClient.get(`/api/v1/tenants/${tenantId}/invoice`);
    return res.data;
}

export async function fetchInvoiceDetail(tenantId, invoiceId) {
    const res = await apiClient.get(`/api/v1/tenants/${tenantId}/invoice/${invoiceId}`);
    return res.data;
}

export async function fetchManualPaymentDetails(tenantId, invoiceId) {
    const res = await apiClient.get(
        `/api/v1/tenants/${encodeURIComponent(tenantId)}/invoice/${invoiceId}/payment-details`,
    );
    return res.data;
}

export async function submitManualPayment(tenantId, invoiceId) {
    const res = await apiClient.post(
        `/api/v1/tenants/${encodeURIComponent(tenantId)}/invoice/${invoiceId}/payment-submission`,
    );
    return res.data;
}
