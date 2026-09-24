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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Telemetry</h1>
                    <p className="text-sm text-gray-500">Watch accepted usage events as they enter the metering pipeline.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">Connection Status:</span>
                    <Badge
                        variant={
                            status === "live" ? "success" : status === "connecting" ? "warning" : "danger"
                        }
                    >
                        {status.toUpperCase()}
                    </Badge>
                </div>
            </div>

            {error && (
                <div className="rounded-lg bg-amber-50 p-4 border border-amber-200 text-amber-800 text-sm">
                    Connection warning: {error}. Reconnecting automatically...
                </div>
            )}

            <Card>
                <div className="flex flex-col gap-2">
                    <h2 className="font-semibold text-gray-900">What telemetry means</h2>
                    <p className="text-sm leading-6 text-gray-600">
                        Telemetry is the near-real-time operational view of accepted events. Use it to confirm that
                        AI and SDK requests are being received, spot duplicate or stale traffic, and diagnose ingestion.
                        PostgreSQL aggregates remain the durable source used for quota and billing totals.
                    </p>
                </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    ["Connection", status.toUpperCase(), status === "live" ? "text-emerald-600" : "text-amber-600"],
                    ["Events visible", events.length, "text-gray-900"],
                    ["Units visible", visibleUnits.toLocaleString(), "text-gray-900"],
                    ["Last event", freshness, "text-gray-900"],
                ].map(([label, value, valueClass]) => (
                    <Card key={label} className="p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
                        <p className={`mt-2 truncate text-lg font-semibold ${valueClass}`}>{value}</p>
                    </Card>
                ))}
            </div>

            <Card>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Live Event Ticker (Max 200)</h3>
                    {lastEventAt && (
                        <span className="text-xs text-gray-400">Last event: {formatDate(lastEventAt)}</span>
                    )}
                </div>
                {events.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center">
                        <p className="font-medium text-gray-700">No telemetry events yet</p>
                        <p className="mt-1 text-sm text-gray-500">Generate an AI request or send an SDK event to see it here.</p>
                    </div>
                ) : (
                    <Table
                        headers={["Event ID", "Tenant ID", "Metric", "Units", "Timestamp"]}
                        data={events}
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
