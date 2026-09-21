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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Realtime Usage Stream</h1>
                    <p className="text-sm text-gray-500">Live SSE stream of incoming metering events.</p>
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
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Live Event Ticker (Max 200)</h3>
                    {lastEventAt && (
                        <span className="text-xs text-gray-400">Last event: {formatDate(lastEventAt)}</span>
                    )}
                </div>
                <Table
                    headers={["Event ID", "Tenant ID", "Metric", "Units", "Timestamp"]}
                    data={events}
                    renderRow={(ev, idx) => (
                        <tr key={ev.eventId || idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-mono text-xs text-gray-900">{ev.eventId}</td>
                            <td className="px-6 py-4 text-gray-700">{ev.tenantId}</td>
                            <td className="px-6 py-4">
                                <Badge variant="info">{ev.metricName}</Badge>
                            </td>
                            <td className="px-6 py-4 tabular-nums font-semibold text-gray-900">{ev.units}</td>
                            <td className="px-6 py-4 text-gray-500">{formatDate(ev.timestamp)}</td>
                        </tr>
                    )}
                />
            </Card>
        </div>
    );
}
