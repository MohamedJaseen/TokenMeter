import React from "react";
import { useAuth } from "../auth/useAuth";
import { useUsageStream } from "../hooks/useUsageStream";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Table } from "../components/ui/Table";
import { formatDate } from "../lib/format";

export default function Realtime() {
    const { user, accessToken } = useAuth();
    const tenantId = user?.tenantId || "tenantA";
    const { events, status, lastEventAt, error } = useUsageStream(tenantId, accessToken);
    const visibleUnits = events.reduce((total, event) => total + (Number(event.units) || 0), 0);
    const freshness = lastEventAt ? formatDate(lastEventAt) : "Waiting for events";

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.13em] text-[#9aabc0]">Live observability</p>
                    <h1 className="text-2xl font-semibold tracking-tight text-[#edf2f8]">Telemetry</h1>
                    <p className="mt-2 text-sm text-[#91a0b2]">Watch accepted usage events as they enter the metering pipeline.</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${status === "live" ? "live-dot bg-emerald-400" : status === "connecting" ? "bg-amber-300" : "bg-rose-400"}`} />
                    <span className="text-xs text-[#9aa9bb]">Stream connection</span>
                    <Badge
                        variant={
                            status === "live" ? "success" : status === "connecting" ? "warning" : "danger"
                        }
                        aria-live="polite"
                    >
                        {status.toUpperCase()}
                    </Badge>
                </div>
            </div>

            {error && (
                <div role="alert" className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
                    Connection warning: {error}. Reconnecting automatically...
                </div>
            )}

            <Card>
                <div className="flex flex-col gap-2">
                    <h2 className="font-semibold text-[#e7edf6]">What telemetry means</h2>
                    <p className="text-sm leading-6 text-[#9aa9bb]">
                        Telemetry is the near-real-time operational view of accepted events. Use it to confirm that
                        AI and SDK requests are being received, spot duplicate or stale traffic, and diagnose ingestion.
                        PostgreSQL aggregates remain the durable source used for quota and billing totals.
                    </p>
                </div>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    ["Connection", status.toUpperCase(), status === "live" ? "text-emerald-600" : "text-amber-600"],
                    ["Events visible", events.length, "text-gray-900"],
                    ["Units visible", visibleUnits.toLocaleString(), "text-gray-900"],
                    ["Last event", freshness, "text-gray-900"],
                ].map(([label, value, valueClass]) => (
                    <Card key={label} className="p-4 sm:p-5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[#8291a4]">{label}</p>
                        <p className={`mt-2 truncate text-lg font-semibold ${valueClass}`}>{value}</p>
                    </Card>
                ))}
            </div>

            <Card>
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-[#e7edf6]">Live event stream</h3>
                        <p className="mt-1 text-xs text-[#8291a4]">Newest accepted events appear first · maximum 200 retained</p>
                    </div>
                    {lastEventAt && (
                        <span className="text-xs text-gray-400">Last event: {formatDate(lastEventAt)}</span>
                    )}
                </div>
                {events.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#35465b] bg-[#0d1520]/70 px-6 py-12 text-center">
                        <p className="font-medium text-[#dce5ef]">Waiting for usage events</p>
                        <p className="mt-1 text-sm text-[#8998ab]">Generate an AI request or send an SDK event to see accepted usage here.</p>
                    </div>
                ) : (
                    <Table
                        headers={["Event ID", "Tenant ID", "Metric", "Units", "Timestamp"]}
                        data={events}
                        label="Live metering events"
                        renderRow={(ev, idx) => (
                            <tr key={ev.eventId || idx} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-mono text-xs text-gray-900">{ev.eventId}</td>
                                <td className="px-6 py-4 text-gray-700">{ev.tenantId}</td>
                                <td className="px-6 py-4"><Badge variant="info">{ev.metricName}</Badge></td>
                                <td className="px-6 py-4 font-semibold tabular-nums text-gray-900">{ev.units}</td>
                                <td className="px-6 py-4 text-gray-500">{formatDate(ev.timestamp)}</td>
                            </tr>
                        )}
                    />
                )}
            </Card>
        </div>
    );
}
