import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminTenants } from "../../api/endpoints/admin";
import { Card } from "../../components/ui/Card";
import { Table } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";
import { ErrorState } from "../../components/ui/ErrorState";
import { formatNumber } from "../../lib/format";

export default function Tenants() {
    const { data: tenants, isLoading, error, refetch } = useQuery({
        queryKey: ["adminTenants"],
        queryFn: fetchAdminTenants,
    });

    if (isLoading) return <Skeleton className="h-64" />;
    if (error) return <ErrorState message="Failed to load tenants list." onRetry={refetch} />;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
                <p className="text-sm text-gray-500">Platform-wide tenant quota overview (SUPER_ADMIN only).</p>
            </div>

            <Card>
                <Table
                    headers={["Tenant ID", "Tier", "Current Usage", "Quota Status"]}
                    data={tenants}
                    renderRow={(t) => (
                        <tr key={t.tenantId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-900">{t.tenantId}</td>
                            <td className="px-6 py-4 text-gray-700 capitalize">{t.tierName || "Enterprise"}</td>
                            <td className="px-6 py-4 tabular-nums text-gray-900">{formatNumber(t.currentUsage)}</td>
                            <td className="px-6 py-4">
                                <Badge variant={t.status === "NORMAL" ? "success" : t.status === "WARNING" ? "warning" : "danger"}>
                                    {t.status || "NORMAL"}
                                </Badge>
                            </td>
                        </tr>
                    )}
                />
            </Card>
        </div>
    );
}
