import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    fetchAdminInvoices,
    fetchAdminTenants,
    generateAdminInvoice,
    updateAdminInvoiceStatus,
} from "../../api/endpoints/admin";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { Skeleton } from "../../components/ui/Skeleton";
import { formatMoney, formatNumber } from "../../lib/format";

function currentPeriod() {
    const now = new Date();
    return {
        periodStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10),
        periodEnd: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10),
    };
}

function csvCell(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function AdminInvoices() {
    const queryClient = useQueryClient();
    const [tenantFilter, setTenantFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [generateForm, setGenerateForm] = useState({ tenantId: "", ...currentPeriod() });
    const [feedback, setFeedback] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const tenantsQuery = useQuery({ queryKey: ["adminTenants"], queryFn: fetchAdminTenants });
    const invoicesQuery = useQuery({
        queryKey: ["adminInvoices", tenantFilter, statusFilter],
        queryFn: () => fetchAdminInvoices({ tenantId: tenantFilter, paymentStatus: statusFilter }),
    });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["adminInvoices"] });

    const generateMutation = useMutation({
        mutationFn: generateAdminInvoice,
        onSuccess: async () => {
            setFeedback("Invoice generated or the existing invoice for this period was returned.");
            setErrorMessage("");
            await refresh();
        },
        onError: (error) => setErrorMessage(error?.response?.data?.message || error.message),
    });
    const statusMutation = useMutation({
        mutationFn: ({ invoiceId, paymentStatus }) => updateAdminInvoiceStatus(invoiceId, paymentStatus),
        onSuccess: async () => {
            setFeedback("Invoice payment status updated.");
            setErrorMessage("");
            await refresh();
        },
        onError: (error) => setErrorMessage(error?.response?.data?.message || error.message),
    });

    const invoices = invoicesQuery.data || [];
    const paidRevenue = invoices
        .filter((invoice) => invoice.paymentStatus === "PAID")
        .reduce((total, invoice) => total + Number(invoice.totalAmountBilled || 0), 0);
    const allListedAmount = invoices.reduce(
        (total, invoice) => total + Number(invoice.totalAmountBilled || 0),
        0);

    const downloadCsv = () => {
        const header = ["invoice_id", "tenant_id", "tenant_name", "period_start", "period_end", "units", "amount", "payment_status", "created_at"];
        const lines = [
            header,
            ...invoices.map((invoice) => [
                invoice.invoiceId,
                invoice.tenantId,
                invoice.tenantName,
                invoice.billingPeriodStart,
                invoice.billingPeriodEnd,
                invoice.totalUnitsConsumed,
                invoice.totalAmountBilled,
                invoice.paymentStatus,
                invoice.createdAt,
            ]),
        ].map((row) => row.map(csvCell).join(","));
        const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "tokenmeter-invoices.csv";
        anchor.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-5">
            <header>
                <h1 className="font-serif text-xl font-bold text-[#f1d766]">Platform billing & invoices</h1>
                <p className="mt-1 text-[11px] text-[#8290a8]">Filter the invoice ledger, generate tenant invoices, and update payment status.</p>
            </header>
            {feedback && <p role="status" className="rounded-md border border-[#31564d] bg-[#132a28] px-3 py-2 text-xs text-[#7fd4b5]">{feedback}</p>}
            {errorMessage && <p role="alert" className="rounded-md border border-[#713f3a] bg-[#301f27] px-3 py-2 text-xs text-[#f0a18d]">{errorMessage}</p>}

            <div className="grid gap-3 sm:grid-cols-3">
                <Card><p className="text-[10px] uppercase text-[#8795ad]">Invoices listed</p><p className="mt-2 font-mono text-xl text-[#f5f7fb]">{formatNumber(invoices.length)}</p></Card>
                <Card><p className="text-[10px] uppercase text-[#8795ad]">Paid revenue in current filter</p><p className="mt-2 font-mono text-xl text-[#f5f7fb]">{formatMoney(Math.round(paidRevenue * 100))}</p></Card>
                <Card><p className="text-[10px] uppercase text-[#8795ad]">Listed invoice total</p><p className="mt-2 font-mono text-xl text-[#f5f7fb]">{formatMoney(Math.round(allListedAmount * 100))}</p></Card>
            </div>

            <Card>
                <form className="grid gap-3 md:grid-cols-4" onSubmit={(event) => {
                    event.preventDefault();
                    setErrorMessage("");
                    generateMutation.mutate({
                        ...generateForm,
                        periodStart: generateForm.periodStart,
                        periodEnd: generateForm.periodEnd,
                    });
                }}>
                    <h2 className="text-sm font-semibold text-[#e5ebf5] md:col-span-4">Generate/finalize invoice</h2>
                    <label className="space-y-1 text-xs text-[#9aa8be]"><span>Tenant</span><select required className={inputClass} value={generateForm.tenantId} onChange={(e) => setGenerateForm({ ...generateForm, tenantId: e.target.value })}><option value="">Choose tenant</option>{(tenantsQuery.data || []).map((tenant) => <option key={tenant.tenantId} value={tenant.tenantId}>{tenant.tenantId} — {tenant.tenantName}</option>)}</select></label>
                    <label className="space-y-1 text-xs text-[#9aa8be]"><span>Period start</span><input required type="date" className={inputClass} value={generateForm.periodStart} onChange={(e) => setGenerateForm({ ...generateForm, periodStart: e.target.value })} /></label>
                    <label className="space-y-1 text-xs text-[#9aa8be]"><span>Period end</span><input required type="date" className={inputClass} value={generateForm.periodEnd} onChange={(e) => setGenerateForm({ ...generateForm, periodEnd: e.target.value })} /></label>
                    <div className="flex items-end"><Button disabled={generateMutation.isPending}>{generateMutation.isPending ? "Generating..." : "Generate invoice"}</Button></div>
                </form>
            </Card>

            <Card>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div className="flex flex-wrap gap-3">
                        <label className="space-y-1 text-xs text-[#9aa8be]"><span>Filter by tenant</span><select className={inputClass} value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)}><option value="">All tenants</option>{(tenantsQuery.data || []).map((tenant) => <option key={tenant.tenantId} value={tenant.tenantId}>{tenant.tenantId}</option>)}</select></label>
                        <label className="space-y-1 text-xs text-[#9aa8be]"><span>Payment status</span><select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All statuses</option><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="FAILED">Failed</option></select></label>
                    </div>
                    <Button variant="outline" disabled={!invoices.length} onClick={downloadCsv}>Download CSV</Button>
                </div>

                {invoicesQuery.isLoading ? <Skeleton className="h-52" /> : invoicesQuery.error ? (
                    <ErrorState message={invoicesQuery.error.message || "Failed to load platform invoices."} onRetry={invoicesQuery.refetch} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-xs text-[#b8c4d6]">
                            <thead className="border-b border-[#283750] text-[10px] uppercase text-[#70809b]"><tr>{["Invoice", "Tenant", "Billing period", "Units", "Amount", "Status", "Actions"].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}</tr></thead>
                            <tbody className="divide-y divide-[#222e43]">{invoices.map((invoice) => <tr key={invoice.invoiceId}>
                                <td className="px-3 py-3 font-mono">{invoice.invoiceId}</td>
                                <td className="px-3 py-3"><span>{invoice.tenantName}</span><span className="block font-mono text-[#8290a8]">{invoice.tenantId}</span></td>
                                <td className="px-3 py-3">{invoice.billingPeriodStart} – {invoice.billingPeriodEnd}</td>
                                <td className="px-3 py-3">{formatNumber(invoice.totalUnitsConsumed)}</td>
                                <td className="px-3 py-3">{formatMoney(Math.round(Number(invoice.totalAmountBilled) * 100))}</td>
                                <td className="px-3 py-3"><Badge variant={invoice.paymentStatus === "PAID" ? "success" : invoice.paymentStatus === "PENDING" ? "warning" : "danger"}>{invoice.paymentStatus}</Badge></td>
                                <td className="px-3 py-3"><select aria-label={`Update status for invoice ${invoice.invoiceId}`} className={inputClass} value={invoice.paymentStatus} disabled={statusMutation.isPending} onChange={(e) => statusMutation.mutate({ invoiceId: invoice.invoiceId, paymentStatus: e.target.value })}><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="FAILED">Failed</option></select></td>
                            </tr>)}
                            {!invoices.length && <tr><td colSpan={7} className="p-8 text-center text-[#8290a8]">No invoices match these filters.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <p className="text-[10px] leading-5 text-[#8290a8]">Invoice generation uses the configured usage aggregates and tenant unit rate. Updating payment status is an administrative ledger action; connect a payment provider before treating it as proof of funds received.</p>
        </div>
    );
}

const inputClass = "rounded-md border border-[#34435b] bg-[#0d1523] px-3 py-2 text-xs text-[#e9eef7] outline-none focus:border-[#d1a91c]";
