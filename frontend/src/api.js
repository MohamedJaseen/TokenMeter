const API_BASE = "http://localhost:8090";

export async function getUsage(tenantId) {
    const response = await fetch(
        `${API_BASE}/api/v1/tenants/${tenantId}/usage`
    );

    if (!response.ok) {
        throw new Error("Failed to load usage");
    }

    return response.json();
}

export async function getQuota(tenantId) {
    const response = await fetch(
        `${API_BASE}/api/v1/tenants/${tenantId}/quota`
    );

    if (!response.ok) {
        throw new Error("Failed to load quota");
    }

    return response.json();
}

export async function getInvoices(tenantId) {
    const response = await fetch(
        `${API_BASE}/api/v1/tenants/${tenantId}/invoice`
    );

    if (!response.ok) {
        throw new Error("Failed to load invoices");
    }

    return response.json();
}