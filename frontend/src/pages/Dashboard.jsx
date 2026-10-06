import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowUpRight, Gauge, ReceiptText, Route, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { fetchUsage } from "../api/endpoints/usage";
import { fetchQuota } from "../api/endpoints/quota";
import { fetchInvoices } from "../api/endpoints/billing";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { ErrorState } from "../components/ui/ErrorState";
import { formatNumber, formatMoney } from "../lib/format";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const ranges = [
    { label: "24H", value: "24h" },
    { label: "7D", value: "7d" },
    { label: "30D", value: "30d" },
];

function MetricCard({ icon: Icon, label, value, note, tone = "neutral" }) {
    return (
        <Card className="metric-card min-w-0 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-medium text-[#91a0b2]">{label}</p>
                    <p className="mt-3 truncate font-mono text-2xl font-semibold tracking-tight text-[#edf2f8] sm:text-[28px]">{value}</p>
                    <p className="mt-2 text-xs text-[#7e8da1]">{note}</p>
                </div>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    tone === "accent" ? "bg-[#d6b65e]/10 text-[#e7c86d]" : "bg-[#243347] text-[#a8bfd0]"
                }`}>
                    <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
            </div>
        </Card>
    );
}

function quotaVariant(status) {
    if (status === "NORMAL") return "success";
    if (status === "WARNING") return "warning";
    return "danger";
}

export default function Dashboard() {
    const { user } = useAuth();
    const tenantId = user?.tenantId || "tenantA";
    const [range, setRange] = useState("24h");
    const usageQuery = useQuery({
        queryKey: ["usage", tenantId, range],
        queryFn: () => fetchUsage(tenantId, range),
        refetchInterval: 5000,
    });
    const quotaQuery = useQuery({
        queryKey: ["quota", tenantId],
        queryFn: () => fetchQuota(tenantId),
        refetchInterval: 5000,
    });
    const invoicesQuery = useQuery({
        queryKey: ["invoices", tenantId],
        queryFn: () => fetchInvoices(tenantId),
    });

    if (usageQuery.isLoading || quotaQuery.isLoading) {
        return (
            <div className="space-y-5" aria-label="Loading dashboard">
                <Skeleton className="h-16" />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32" />)}
                </div>
                <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
            </div>
        );
    }

    if (usageQuery.error || quotaQuery.error) {
        return (
            <ErrorState
                message={quotaQuery.error?.message || usageQuery.error?.message || "Dashboard data could not be loaded."}
                onRetry={() => { void usageQuery.refetch(); void quotaQuery.refetch(); }}
            />
        );
    }

    const usage = usageQuery.data;
    const quota = quotaQuery.data;
    const latestInvoice = invoicesQuery.data?.[0];
    const usagePercent = Math.min(Math.max(Number(quota?.usagePercentage || 0), 0), 100);
    const threshold = Number(quota?.alertThresholdPercent || 80);
    const quotaTone = quota?.status === "NORMAL" ? "bg-emerald-400" : quota?.status === "WARNING" ? "bg-amber-300" : "bg-rose-400";

    return (
        <div className="space-y-6 sm:space-y-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.13em] text-[#9aabc0]">Workspace overview</p>
                    <h1 className="text-2xl font-semibold tracking-tight text-[#edf2f8] sm:text-[28px]">Dashboard</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#91a0b2]">Monitor requests, model tokens, and quota health across your metered integrations.</p>
                </div>
                <div className="inline-flex w-fit rounded-xl border border-[#2b3b4e] bg-[#101925] p-1" role="group" aria-label="Usage time range">
                    {ranges.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            aria-pressed={range === item.value}
                            onClick={() => setRange(item.value)}
                            className={`min-h-8 rounded-lg px-3 text-xs font-medium transition ${
                                range === item.value ? "bg-[#d6b65e] text-[#141820]" : "text-[#aab6c5] hover:bg-[#1b2938] hover:text-white"
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </header>

            <section aria-label="Key usage metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Route} label="API requests" value={formatNumber(usage?.apiCallsCount)} note="Requests processed" tone="accent" />
                <MetricCard icon={Sparkles} label="LLM tokens" value={formatNumber(usage?.llmTokensCount)} note="Across metered AI calls" />
                <MetricCard
                    icon={ReceiptText}
                    label="Latest invoice"
                    value={invoicesQuery.isLoading ? "Loading…" : latestInvoice ? formatMoney(Math.round(Number(latestInvoice.totalAmountBilled || 0) * 100), "USD") : "—"}
                    note={invoicesQuery.error ? "Invoice history unavailable" : latestInvoice ? `${latestInvoice.billingPeriodStart} – ${latestInvoice.billingPeriodEnd}` : "No invoice available"}
                />
                <MetricCard
                    icon={Gauge}
                    label="Quota consumed"
                    value={`${formatNumber(quota?.usagePercentage || 0)}%`}
                    note={`${formatNumber(quota?.currentUsage)} of ${formatNumber(quota?.monthlyLimit)} units`}
                    tone={quota?.status === "EXCEEDED" ? "neutral" : "accent"}
                />
            </section>

            <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
                <Card className="min-w-0 p-4 sm:p-5">
                    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-[#e5ebf3]">Usage trend</h2>
                            <p className="mt-1 text-xs text-[#8291a4]">Metered units in the selected period</p>
                        </div>
                        <Badge variant="info"><Activity aria-hidden="true" className="h-3 w-3" /> {range === "24h" ? "Hourly" : "Time series"}</Badge>
                    </div>
                    <div className="h-[250px] w-full sm:h-[290px]" role="img" aria-label={`Usage trend chart for the last ${range}`}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={usage?.hourlyUsage || []} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="usageFill" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="#d6b65e" stopOpacity=".2" />
                                        <stop offset="95%" stopColor="#d6b65e" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="#263445" strokeDasharray="3 5" />
                                <XAxis
                                    dataKey="bucketHour"
                                    tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    tick={{ fill: "#8291a4", fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    minTickGap={24}
                                />
                                <YAxis tick={{ fill: "#8291a4", fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
                                <Tooltip
                                    labelFormatter={(value) => new Date(value).toLocaleString()}
                                    formatter={(value) => [formatNumber(value), "Units"]}
                                    contentStyle={{ background: "#111b28", border: "1px solid #35465b", borderRadius: 10, color: "#e7edf6", fontSize: 12 }}
                                    labelStyle={{ color: "#aab7c7", marginBottom: 4 }}
                                />
                                <Area type="monotone" dataKey="units" name="Usage" stroke="#d6b65e" fill="url(#usageFill)" strokeWidth={2} activeDot={{ r: 4, fill: "#e7c86d", stroke: "#101925" }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    {!usage?.hourlyUsage?.length && <p className="mt-2 text-center text-xs text-[#7e8da1]">No usage buckets are available for this period yet.</p>}
                </Card>

                <Card className="flex min-w-0 flex-col p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-[#e5ebf3]">Quota health</h2>
                            <p className="mt-1 text-xs text-[#8291a4]">{quota?.tierName || "Current plan"} allowance</p>
                        </div>
                        <Badge variant={quotaVariant(quota?.status)}>{quota?.status || "UNKNOWN"}</Badge>
                    </div>

                    <div className="mt-7">
                        <div className="mb-2 flex items-end justify-between gap-2">
                            <span className="font-mono text-3xl font-semibold tracking-tight text-[#edf2f8]">{formatNumber(quota?.usagePercentage || 0)}%</span>
                            <span className="text-right text-xs text-[#91a0b2]">of monthly limit</span>
                        </div>
                        <div
                            className="h-2.5 overflow-hidden rounded-full bg-[#263445]"
                            role="progressbar"
                            aria-label="Monthly quota used"
                            aria-valuenow={usagePercent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        >
                            <div className={`h-full rounded-full transition-[width] duration-500 ${quotaTone}`} style={{ width: `${usagePercent}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-[#8291a4]">{formatNumber(quota?.currentUsage)} used <span className="px-1 text-[#5e6d80]">/</span> {formatNumber(quota?.monthlyLimit)} units</p>
                    </div>

                    <div className="mt-6 space-y-3 border-t border-[#263445] pt-4">
                        <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="flex items-center gap-2 text-[#aebaca]"><span className="h-2 w-2 rounded-full bg-amber-300" /> Alert threshold</span>
                            <span className="font-mono text-[#e5ebf3]">{threshold}%</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="flex items-center gap-2 text-[#aebaca]"><span className={`h-2 w-2 rounded-full ${quota?.hardCapEnabled ? "bg-rose-400" : "bg-[#68788b]"}`} /> Hard cap</span>
                            <span className="text-[#d3dce7]">{quota?.hardCapEnabled ? "Enabled" : "Disabled"}</span>
                        </div>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-2 pt-6">
                        <Link to="/dashboard/quotas" className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#35465b] px-3.5 py-2 text-xs font-semibold text-[#c9d3df] transition hover:border-[#50647b] hover:bg-[#182332]">
                            View quota settings <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                        <Link to="/dashboard/realtime" className="self-center text-xs text-[#b9a765] hover:text-[#e7c86d]">Open telemetry</Link>
                    </div>
                </Card>
            </section>
        </div>
    );
}
