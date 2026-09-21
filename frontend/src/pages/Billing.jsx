import React, { useState } from "react";
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
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Billing & Invoice History</h1>
                <p className="text-sm text-gray-500">Immutable billing snapshots and itemized invoice records.</p>
            </div>

            <Card>
                <Table
                    headers={["Invoice ID", "Billing Period", "Total Units", "Total Amount", "Status", "Issued At"]}
                    data={invoices}
                    renderRow={(inv) => (
                        <tr key={inv.invoiceId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-900">{inv.invoiceId}</td>
                            <td className="px-6 py-4 text-gray-700">
                                {inv.billingPeriodStart} &rarr; {inv.billingPeriodEnd}
                            </td>
                            <td className="px-6 py-4 tabular-nums text-gray-900">{inv.totalUnitsConsumed}</td>
                            <td className="px-6 py-4 font-semibold text-gray-900 tabular-nums">
                                {formatMoney(Math.round(Number(inv.totalAmountBilled || 0) * 100), "USD")}
                            </td>
                            <td className="px-6 py-4">
                                <Badge variant={inv.paymentStatus === "PAID" ? "success" : "warning"}>
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
