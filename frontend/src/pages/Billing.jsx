import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/useAuth";
import { fetchInvoices } from "../api/endpoints/billing";
import { Card } from "../components/ui/Card";
import { Table } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { ErrorState } from "../components/ui/ErrorState";
import { formatMoney, formatDate } from "../lib/format";

export default function Billing() {
    const { user } = useAuth();
    const tenantId = user?.tenantId || "tenantA";

    const { data: invoices, isLoading, error, refetch } = useQuery({
        queryKey: ["invoices", tenantId],
        queryFn: () => fetchInvoices(tenantId),
    });

    if (isLoading) return <Skeleton className="h-64" />;
    if (error) return <ErrorState message="Failed to load invoice history." onRetry={refetch} />;

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.13em] text-[#9aabc0]">Workspace billing</p>
                    <h1 className="text-2xl font-semibold tracking-tight text-[#edf2f8]">Billing & invoices</h1>
                    <p className="mt-2 text-sm text-[#91a0b2]">Review finalized billing snapshots and payment status.</p>
                </div>
                <Badge variant="info">{invoices?.length || 0} invoice{invoices?.length === 1 ? "" : "s"}</Badge>
            </div>

            <Card>
                <Table
                    headers={["Invoice ID", "Billing period", "Total units", "Total amount", "Status", "Issued at"]}
                    data={invoices}
                    label="Invoice history"
                    renderRow={(inv) => (
                        <tr key={inv.invoiceId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-900">{inv.invoiceId}</td>
                            <td className="px-6 py-4 text-gray-700">
                                <span className="whitespace-nowrap">{inv.billingPeriodStart} <span className="px-1 text-[#64748b]">→</span> {inv.billingPeriodEnd}</span>
                            </td>
                            <td className="px-6 py-4 tabular-nums text-gray-900">{inv.totalUnitsConsumed}</td>
                            <td className="px-6 py-4 font-semibold text-gray-900 tabular-nums">
                                {formatMoney(Math.round(Number(inv.totalAmountBilled || 0) * 100), "USD")}
                            </td>
                            <td className="px-6 py-4">
                                <Badge variant={inv.paymentStatus === "PAID" ? "success" : inv.paymentStatus === "FAILED" ? "danger" : "warning"}>
                                    {inv.paymentStatus || "PENDING"}
                                </Badge>
                            </td>
                            <td className="px-6 py-4 text-gray-500">{formatDate(inv.createdAt)}</td>
                        </tr>
                    )}
                />
            </Card>
        </div>
    );
}
