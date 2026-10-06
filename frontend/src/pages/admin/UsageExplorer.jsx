import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminTenants, searchAdminUsageEvents } from "../../api/endpoints/admin";
import { Card } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { Skeleton } from "../../components/ui/Skeleton";
import { formatDate, formatNumber } from "../../lib/format";

export default function AdminUsageExplorer() {
    const [filters, setFilters] = useState({
        tenantId: "",
        metricName: "",
        from: "",
        to: "",
        limit: "100",
    });
    const [submitted, setSubmitted] = useState(filters);
    const tenantsQuery = useQuery({ queryKey: ["adminTenants"], queryFn: fetchAdminTenants });
    const eventsQuery = useQuery({
        queryKey: ["adminUsageEvents", submitted],
        queryFn: () => searchAdminUsageEvents({
            ...submitted,
            from: submitted.from ? new Date(submitted.from).toISOString() : "",
            to: submitted.to ? new Date(submitted.to).toISOString() : "",
        }),
    });
    const events = eventsQuery.data || [];
    const totalUnits = events.reduce((sum, event) => sum + Number(event.units || 0), 0);

    return (
        <div className="space-y-5">
            <header>
                <h1 className="font-serif text-xl font-bold text-[#f1d766]">Usage / metering explorer</h1>
                <p className="mt-1 text-[11px] text-[#8290a8]">Search processed usage events recorded by the metering worker.</p>
            </header>

            <Card>
                <form className="grid gap-3 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); setSubmitted(filters); }}>
                    <label className="space-y-1 text-xs text-[#9aa8be]"><span>Tenant</span><select className={inputClass} value={filters.tenantId} onChange={(e) => setFilters({ ...filters, tenantId: e.target.value })}><option value="">All tenants</option>{(tenantsQuery.data || []).map((tenant) => <option key={tenant.tenantId} value={tenant.tenantId}>{tenant.tenantId}</option>)}</select></label>
                    <label className="space-y-1 text-xs text-[#9aa8be]"><span>Metric</span><input className={inputClass} placeholder="e.g. llm_tokens" value={filters.metricName} onChange={(e) => setFilters({ ...filters, metricName: e.target.value })} /></label>
                    <label className="space-y-1 text-xs text-[#9aa8be]"><span>Max events (up to 500)</span><input className={inputClass} type="number" min="1" max="500" value={filters.limit} onChange={(e) => setFilters({ ...filters, limit: e.target.value })} /></label>
                    <label className="space-y-1 text-xs text-[#9aa8be]"><span>Event time from</span><input className={inputClass} type="datetime-local" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></label>
                    <label className="space-y-1 text-xs text-[#9aa8be]"><span>Event time to</span><input className={inputClass} type="datetime-local" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></label>
                    <div className="flex items-end"><button className="rounded-md bg-[#d1a91c] px-3 py-2 text-xs font-semibold text-[#101522]" type="submit">Search events</button></div>
                </form>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2">
                <Card><p className="text-[10px] uppercase text-[#8795ad]">Processed events listed</p><p className="mt-2 font-mono text-xl text-[#f5f7fb]">{formatNumber(events.length)}</p></Card>
                <Card><p className="text-[10px] uppercase text-[#8795ad]">Units in result</p><p className="mt-2 font-mono text-xl text-[#f5f7fb]">{formatNumber(totalUnits)}</p></Card>
            </div>

            <Card>
                {eventsQuery.isLoading ? <Skeleton className="h-52" /> : eventsQuery.error ? (
                    <ErrorState message={eventsQuery.error.message || "Failed to search usage events."} onRetry={eventsQuery.refetch} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px] text-left text-xs text-[#b8c4d6]">
                            <thead className="border-b border-[#283750] text-[10px] uppercase text-[#70809b]"><tr>{["Event ID", "Tenant", "Metric", "Units", "Event timestamp", "Processing", "Latency", "Duplicate"].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}</tr></thead>
                            <tbody className="divide-y divide-[#222e43]">{events.map((event) => <tr key={`${event.tenantId}-${event.eventId}`}>
                                <td className="max-w-[180px] truncate px-3 py-3 font-mono">{event.eventId}</td>
                                <td className="px-3 py-3 font-mono">{event.tenantId}</td>
                                <td className="px-3 py-3">{event.metricName}</td>
                                <td className="px-3 py-3 tabular-nums">{formatNumber(event.units)}</td>
                                <td className="px-3 py-3">{formatDate(event.eventTimestamp)}</td>
                                <td className="px-3 py-3">{event.processingStatus}</td>
                                <td className="px-3 py-3">{formatNumber(event.latencyMillis)} ms</td>
                                <td className="px-3 py-3">{event.duplicate ? "Yes" : "No"}</td>
                            </tr>)}
                            {!events.length && <tr><td colSpan={8} className="p-8 text-center text-[#8290a8]">No processed usage events match these filters.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <p className="text-[10px] leading-5 text-[#8290a8]">This ledger records processed events only. Requests rejected as duplicates at ingestion and events still pending or failed in Redis are not included; inspect service logs/Redis pending entries for those states. Latency is measured from the event timestamp to worker processing.</p>
        </div>
    );
}

const inputClass = "w-full rounded-md border border-[#34435b] bg-[#0d1523] px-3 py-2 text-xs text-[#e9eef7] outline-none focus:border-[#d1a91c]";
