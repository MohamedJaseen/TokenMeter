import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createAdminTenant,
    createAdminTenantApiKey,
    fetchAdminTenant,
    generateAdminInvoice,
    fetchAdminTenants,
    resetAdminTenantQuota,
    revokeAdminTenantApiKey,
    updateAdminTenant,
    updateAdminTenantQuota,
    updateAdminTenantStatus,
} from "../../api/endpoints/admin";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { Skeleton } from "../../components/ui/Skeleton";
import { formatMoney, formatNumber } from "../../lib/format";

const initialCreateForm = {
    tenantId: "",
    tenantName: "",
    contactEmail: "",
    adminUsername: "",
    adminPassword: "",
    planName: "FREE",
    monthlyUnitLimit: 10000,
    alertThresholdPercent: 80,
    hardCapEnabled: true,
    unitRateDollars: 0.005,
};

function Field({ label, children }) {
    return (
        <label className="block space-y-1 text-xs text-[#9aa8be]">
            <span>{label}</span>
            {children}
        </label>
    );
}

const inputClass = "w-full rounded-md border border-[#34435b] bg-[#0d1523] px-3 py-2 text-xs text-[#e9eef7] outline-none focus:border-[#d1a91c]";

export default function Tenants() {
    const queryClient = useQueryClient();
    const [selectedTenantId, setSelectedTenantId] = useState("");
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createForm, setCreateForm] = useState(initialCreateForm);
    const [quotaForm, setQuotaForm] = useState(null);
    const [newKeyLabel, setNewKeyLabel] = useState("Admin-created key");
    const [tenantProfile, setTenantProfile] = useState(null);
    const [oneTimeSecret, setOneTimeSecret] = useState("");
    const [feedback, setFeedback] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const tenantsQuery = useQuery({
        queryKey: ["adminTenants"],
        queryFn: fetchAdminTenants,
    });
    const profileMutation = useMutation({
        mutationFn: (profile) => updateAdminTenant(selectedTenantId, {
            ...profile,
            contactEmail: profile.contactEmail || null,
        }),
        onSuccess: async () => {
            setFeedback("Tenant profile updated.");
            setErrorMessage("");
            await refreshTenantData();
        },
        onError: (error) => setErrorMessage(error?.response?.data?.message || error.message),
    });
    const detailQuery = useQuery({
        queryKey: ["adminTenant", selectedTenantId],
        queryFn: () => fetchAdminTenant(selectedTenantId),
        enabled: Boolean(selectedTenantId),
    });
    const detail = detailQuery.data;

    useEffect(() => {
        if (detail?.quota) {
            setQuotaForm({
                tierName: detail.quotaConfig.tierName,
                monthlyUnitLimit: detail.quotaConfig.monthlyUnitLimit,
                hardCapEnabled: detail.quotaConfig.hardCapEnabled,
                alertThresholdPercent: detail.quotaConfig.alertThresholdPercent,
                unitRateDollars: detail.quotaConfig.unitRateDollars,
            });
        }
    }, [detail]);

    useEffect(() => {
        if (detail?.tenant) {
            setTenantProfile({
                tenantName: detail.tenant.tenantName,
                contactEmail: detail.tenant.contactEmail || "",
            });
        }
    }, [detail]);

    const refreshTenantData = async (tenantId = selectedTenantId) => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["adminTenants"] }),
            tenantId && queryClient.invalidateQueries({ queryKey: ["adminTenant", tenantId] }),
        ]);
    };

    const createMutation = useMutation({
        mutationFn: createAdminTenant,
        onSuccess: async (result) => {
            setOneTimeSecret(result.secret || "");
            setFeedback("Tenant and initial administrator created.");
            setErrorMessage("");
            setShowCreateForm(false);
            setCreateForm(initialCreateForm);
            setSelectedTenantId(result.tenantId);
            await refreshTenantData(result.tenantId);
        },
        onError: (error) => setErrorMessage(error?.response?.data?.message || error.message),
    });

    const statusMutation = useMutation({
        mutationFn: ({ tenantId, status }) => updateAdminTenantStatus(tenantId, status),
        onSuccess: async () => {
            setFeedback("Tenant status updated.");
            setErrorMessage("");
            await refreshTenantData();
        },
        onError: (error) => setErrorMessage(error?.response?.data?.message || error.message),
    });

    const quotaMutation = useMutation({
        mutationFn: (form) => updateAdminTenantQuota(selectedTenantId, form),
        onSuccess: async () => {
            setFeedback("Plan and quota configuration saved.");
            setErrorMessage("");
            await refreshTenantData();
        },
        onError: (error) => setErrorMessage(error?.response?.data?.message || error.message),
    });

    const resetMutation = useMutation({
        mutationFn: () => resetAdminTenantQuota(selectedTenantId),
        onSuccess: async () => {
            setFeedback("Current-month quota counter reset to zero.");
            setErrorMessage("");
            await refreshTenantData();
        },
        onError: (error) => setErrorMessage(error?.response?.data?.message || error.message),
    });

    const createKeyMutation = useMutation({
        mutationFn: () => createAdminTenantApiKey(selectedTenantId, newKeyLabel),
        onSuccess: async (result) => {
            setOneTimeSecret(result.secret || "");
            setFeedback("API key created. Copy the secret now; it cannot be viewed again.");
            setErrorMessage("");
            await refreshTenantData();
        },
        onError: (error) => setErrorMessage(error?.response?.data?.message || error.message),
    });

    const revokeKeyMutation = useMutation({
        mutationFn: (keyId) => revokeAdminTenantApiKey(selectedTenantId, keyId),
        onSuccess: refreshTenantData,
        onError: (error) => setErrorMessage(error?.response?.data?.message || error.message),
    });

    const generateInvoice = async () => {
        const now = new Date();
        const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
        const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
        try {
            await generateAdminInvoice({ tenantId: selectedTenantId, periodStart, periodEnd });
            setFeedback("Invoice generated (or existing invoice returned) for this billing period.");
            setErrorMessage("");
            await refreshTenantData();
        } catch (error) {
            setErrorMessage(error?.response?.data?.message || error.message);
        }
    };

    if (tenantsQuery.isLoading) return <Skeleton className="h-64" />;
    if (tenantsQuery.error) return <ErrorState message={tenantsQuery.error.message || "Failed to load tenants."} onRetry={tenantsQuery.refetch} />;

    const tenants = tenantsQuery.data || [];

    return (
        <div className="space-y-5">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="font-serif text-xl font-bold text-[#f1d766]">Tenant management</h1>
                    <p className="mt-1 text-[11px] text-[#8290a8]">Create organizations, manage access and plans, and review tenant activity.</p>
                </div>
                <Button onClick={() => { setShowCreateForm((shown) => !shown); setErrorMessage(""); }}>
                    {showCreateForm ? "Close form" : "Create tenant"}
                </Button>
            </header>

            {feedback && <p role="status" className="rounded-md border border-[#31564d] bg-[#132a28] px-3 py-2 text-xs text-[#7fd4b5]">{feedback}</p>}
            {errorMessage && <p role="alert" className="rounded-md border border-[#713f3a] bg-[#301f27] px-3 py-2 text-xs text-[#f0a18d]">{errorMessage}</p>}
            {oneTimeSecret && (
                <Card>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div><h2 className="text-sm font-semibold text-[#f1d766]">Copy this API key now</h2><p className="mt-1 text-xs text-[#8290a8]">This secret is shown only once.</p></div>
                        <code className="break-all rounded bg-[#0d1523] p-2 text-xs text-[#e5ebf5]">{oneTimeSecret}</code>
                        <Button variant="outline" onClick={() => setOneTimeSecret("")}>Dismiss</Button>
                    </div>
                </Card>
            )}

            {showCreateForm && (
                <Card>
                    <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => {
                        event.preventDefault();
                        setErrorMessage("");
                        createMutation.mutate({
                            ...createForm,
                            monthlyUnitLimit: Number(createForm.monthlyUnitLimit),
                            alertThresholdPercent: Number(createForm.alertThresholdPercent),
                            unitRateDollars: Number(createForm.unitRateDollars),
                        });
                    }}>
                        <h2 className="text-sm font-semibold text-[#e5ebf5] md:col-span-2">Create organization and its first administrator</h2>
                        <Field label="Tenant ID"><input className={inputClass} required maxLength={64} value={createForm.tenantId} onChange={(e) => setCreateForm({ ...createForm, tenantId: e.target.value })} /></Field>
                        <Field label="Organization name"><input className={inputClass} required value={createForm.tenantName} onChange={(e) => setCreateForm({ ...createForm, tenantName: e.target.value })} /></Field>
                        <Field label="Contact email"><input className={inputClass} type="email" value={createForm.contactEmail} onChange={(e) => setCreateForm({ ...createForm, contactEmail: e.target.value })} /></Field>
                        <Field label="Initial admin username"><input className={inputClass} required value={createForm.adminUsername} onChange={(e) => setCreateForm({ ...createForm, adminUsername: e.target.value })} /></Field>
                        <Field label="Temporary password (minimum 6 characters)"><input className={inputClass} required type="password" minLength={6} value={createForm.adminPassword} onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })} /></Field>
                        <Field label="Plan name"><input className={inputClass} required value={createForm.planName} onChange={(e) => setCreateForm({ ...createForm, planName: e.target.value })} /></Field>
                        <Field label="Monthly unit limit"><input className={inputClass} type="number" min="1" required value={createForm.monthlyUnitLimit} onChange={(e) => setCreateForm({ ...createForm, monthlyUnitLimit: e.target.value })} /></Field>
                        <Field label="Alert threshold (%)"><input className={inputClass} type="number" min="1" max="100" required value={createForm.alertThresholdPercent} onChange={(e) => setCreateForm({ ...createForm, alertThresholdPercent: e.target.value })} /></Field>
                        <Field label="Unit rate (₹)"><input className={inputClass} type="number" min="0" step="0.000001" required value={createForm.unitRateDollars} onChange={(e) => setCreateForm({ ...createForm, unitRateDollars: e.target.value })} /></Field>
                        <label className="flex items-center gap-2 text-xs text-[#c5cfde]"><input type="checkbox" checked={createForm.hardCapEnabled} onChange={(e) => setCreateForm({ ...createForm, hardCapEnabled: e.target.checked })} />Enable hard cap</label>
                        <div className="flex justify-end md:col-span-2"><Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create tenant"}</Button></div>
                    </form>
                </Card>
            )}

            <Card className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs text-[#b8c4d6]">
                    <thead className="border-b border-[#283750] text-[10px] uppercase text-[#70809b]">
                        <tr>{["Tenant", "Plan", "Usage", "Status", "Quota", "Actions"].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-[#222e43]">
                        {tenants.map((tenant) => (
                            <tr key={tenant.tenantId}>
                                <td className="px-3 py-3"><span className="font-mono text-[#e5ebf5]">{tenant.tenantId}</span><span className="block text-[#8290a8]">{tenant.tenantName}</span></td>
                                <td className="px-3 py-3">{tenant.tierName}</td>
                                <td className="px-3 py-3 tabular-nums">{formatNumber(tenant.currentUsage)} / {formatNumber(tenant.monthlyLimit)}</td>
                                <td className="px-3 py-3"><Badge variant={tenant.tenantStatus === "ACTIVE" ? "success" : "danger"}>{tenant.tenantStatus}</Badge></td>
                                <td className="px-3 py-3"><Badge variant={tenant.quotaStatus === "NORMAL" ? "success" : tenant.quotaStatus === "WARNING" ? "warning" : "danger"}>{tenant.quotaStatus}</Badge></td>
                                <td className="px-3 py-3">
                                    <div className="flex flex-wrap gap-2">
                                        <Button variant="outline" onClick={() => { setSelectedTenantId(tenant.tenantId === selectedTenantId ? "" : tenant.tenantId); setFeedback(""); setErrorMessage(""); }}>
                                            {tenant.tenantId === selectedTenantId ? "Hide details" : "Manage"}
                                        </Button>
                                        <Button
                                            variant={tenant.tenantStatus === "ACTIVE" ? "danger" : "secondary"}
                                            disabled={statusMutation.isPending}
                                            onClick={() => statusMutation.mutate({ tenantId: tenant.tenantId, status: tenant.tenantStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })}
                                        >
                                            {tenant.tenantStatus === "ACTIVE" ? "Suspend" : "Activate"}
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {tenants.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-[#8290a8]">No tenants found.</td></tr>}
                    </tbody>
                </table>
            </Card>

            {selectedTenantId && (
                <Card className="space-y-4">
                    {detailQuery.isLoading ? <Skeleton className="h-48" /> : detailQuery.error ? (
                        <ErrorState message={detailQuery.error.message || "Failed to load tenant details."} onRetry={detailQuery.refetch} />
                    ) : detail && (
                        <>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div><h2 className="text-base font-semibold text-[#f1d766]">{detail.tenant.tenantName}</h2><p className="font-mono text-xs text-[#8290a8]">{detail.tenant.tenantId} · {detail.tenant.contactEmail || "No contact email"}</p></div>
                                <div className="flex gap-2"><Button variant="outline" onClick={() => void generateInvoice()}>Generate current invoice</Button><Button variant="danger" disabled={resetMutation.isPending} onClick={() => {
                                    if (window.confirm(`Reset ${selectedTenantId}'s current-month quota counter? This affects quota only; usage and invoices remain unchanged.`)) resetMutation.mutate();
                                }}>Reset current-month quota</Button></div>
                            </div>

                            {tenantProfile && <form className="grid gap-3 rounded-md border border-[#2b3a53] p-3 sm:grid-cols-2" onSubmit={(event) => {
                                event.preventDefault();
                                profileMutation.mutate(tenantProfile);
                            }}>
                                <h3 className="text-sm font-semibold text-[#e5ebf5] sm:col-span-2">Organization profile</h3>
                                <Field label="Organization name"><input className={inputClass} required value={tenantProfile.tenantName} onChange={(e) => setTenantProfile({ ...tenantProfile, tenantName: e.target.value })} /></Field>
                                <Field label="Contact email"><input className={inputClass} type="email" value={tenantProfile.contactEmail} onChange={(e) => setTenantProfile({ ...tenantProfile, contactEmail: e.target.value })} /></Field>
                                <div className="flex justify-end sm:col-span-2"><Button disabled={profileMutation.isPending}>{profileMutation.isPending ? "Saving..." : "Save profile"}</Button></div>
                            </form>}

                            <section className="grid gap-3 sm:grid-cols-3">
                                <Card><p className="text-[10px] text-[#8795ad]">30-day API calls</p><p className="mt-1 font-mono text-lg text-[#f5f7fb]">{formatNumber(detail.usage.apiCallsCount)}</p></Card>
                                <Card><p className="text-[10px] text-[#8795ad]">30-day LLM tokens</p><p className="mt-1 font-mono text-lg text-[#f5f7fb]">{formatNumber(detail.usage.llmTokensCount)}</p></Card>
                                <Card><p className="text-[10px] text-[#8795ad]">Current quota use</p><p className="mt-1 font-mono text-lg text-[#f5f7fb]">{formatNumber(detail.quota.currentUsage)} / {formatNumber(detail.quota.monthlyLimit)}</p></Card>
                            </section>

                            {quotaForm && <form className="grid gap-3 rounded-md border border-[#2b3a53] p-3 sm:grid-cols-2" onSubmit={(event) => {
                                event.preventDefault();
                                quotaMutation.mutate({ ...quotaForm, monthlyUnitLimit: Number(quotaForm.monthlyUnitLimit), alertThresholdPercent: Number(quotaForm.alertThresholdPercent), unitRateDollars: Number(quotaForm.unitRateDollars) });
                            }}>
                                <h3 className="text-sm font-semibold text-[#e5ebf5] sm:col-span-2">Plan and quota configuration</h3>
                                <Field label="Plan name"><input className={inputClass} value={quotaForm.tierName} onChange={(e) => setQuotaForm({ ...quotaForm, tierName: e.target.value })} /></Field>
                                <Field label="Monthly unit limit"><input className={inputClass} type="number" min="1" value={quotaForm.monthlyUnitLimit} onChange={(e) => setQuotaForm({ ...quotaForm, monthlyUnitLimit: e.target.value })} /></Field>
                                <Field label="Warning threshold (%)"><input className={inputClass} type="number" min="1" max="100" value={quotaForm.alertThresholdPercent} onChange={(e) => setQuotaForm({ ...quotaForm, alertThresholdPercent: e.target.value })} /></Field>
                                <Field label="Unit rate (₹)"><input className={inputClass} type="number" min="0" step="0.000001" value={quotaForm.unitRateDollars} onChange={(e) => setQuotaForm({ ...quotaForm, unitRateDollars: e.target.value })} /></Field>
                                <label className="flex items-center gap-2 text-xs text-[#c5cfde]"><input type="checkbox" checked={quotaForm.hardCapEnabled} onChange={(e) => setQuotaForm({ ...quotaForm, hardCapEnabled: e.target.checked })} />Enable hard cap</label>
                                <div className="flex justify-end sm:col-span-2"><Button disabled={quotaMutation.isPending}>{quotaMutation.isPending ? "Saving..." : "Save plan & quota"}</Button></div>
                            </form>}

                            <section className="space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-[#e5ebf5]">Tenant API keys</h3><div className="flex gap-2"><input className={inputClass} aria-label="New API key label" value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} /><Button variant="outline" disabled={createKeyMutation.isPending} onClick={() => createKeyMutation.mutate()}>Create key</Button></div></div>
                                <div className="divide-y divide-[#283750] rounded border border-[#283750]">
                                    {detail.apiKeys.map((key) => <div key={key.keyId} className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs"><div><code className="text-[#e5ebf5]">{key.prefix}…</code><span className="ml-2 text-[#8290a8]">{key.label}</span><span className="ml-2 text-[#8290a8]">{key.revoked ? "REVOKED" : "ACTIVE"}</span></div>{!key.revoked && <Button variant="danger" onClick={() => {
                                        if (window.confirm(`Revoke the API key "${key.label}"?`)) revokeKeyMutation.mutate(key.keyId);
                                    }}>Revoke</Button>}</div>)}
                                    {detail.apiKeys.length === 0 && <p className="p-4 text-xs text-[#8290a8]">No API keys for this tenant.</p>}
                                </div>
                            </section>

                            <section>
                                <h3 className="mb-2 text-sm font-semibold text-[#e5ebf5]">Tenant invoices</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs text-[#b8c4d6]">
                                        <thead className="border-b border-[#283750] text-[10px] uppercase text-[#70809b]"><tr>{["Invoice", "Period", "Units", "Amount", "Status"].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}</tr></thead>
                                        <tbody className="divide-y divide-[#222e43]">{detail.invoices.map((invoice) => <tr key={invoice.invoiceId}><td className="px-3 py-2 font-mono">{invoice.invoiceId}</td><td className="px-3 py-2">{invoice.billingPeriodStart} – {invoice.billingPeriodEnd}</td><td className="px-3 py-2">{formatNumber(invoice.totalUnitsConsumed)}</td><td className="px-3 py-2">{formatMoney(Math.round(Number(invoice.totalAmountBilled) * 100))}</td><td className="px-3 py-2">{invoice.paymentStatus}</td></tr>)}</tbody>
                                    </table>
                                </div>
                            </section>
                        </>
                    )}
                </Card>
            )}
        </div>
    );
}
