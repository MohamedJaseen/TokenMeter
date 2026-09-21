import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

export default function Dashboard() {
    const { user } = useAuth(); const tenantId = user?.tenantId || "tenantA"; const [range, setRange] = useState("24h");
    const { data: usage, isLoading: usageLoading, error: usageError, refetch: refetchUsage } = useQuery({ queryKey: ["usage", tenantId, range], queryFn: () => fetchUsage(tenantId, range) });
    const { data: quota, isLoading: quotaLoading, error: quotaError } = useQuery({ queryKey: ["quota", tenantId], queryFn: () => fetchQuota(tenantId) });
    const { data: invoices } = useQuery({ queryKey: ["invoices", tenantId], queryFn: () => fetchInvoices(tenantId) });
    if (usageLoading || quotaLoading) return <div className="space-y-4"><Skeleton className="h-28" /><div className="grid gap-3 md:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div><Skeleton className="h-72" /></div>;
    if (usageError || quotaError) return <ErrorState message="Failed to load dashboard data." onRetry={refetchUsage} />;
    const latestInvoice = invoices?.[0]; const quotaStatus = quota?.status === "NORMAL" ? "success" : quota?.status === "WARNING" ? "warning" : "danger";
    return <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="font-serif text-xl font-bold text-[#f1d766]">Dashboard</h1><p className="mt-1 text-[11px] text-[#8290a8]">How much you’re consuming right now, across every metered integration.</p></div><div className="flex rounded border border-[#2b3a53] bg-[#101827] p-0.5">{["24h","7d","30d"].map(r=><button key={r} onClick={()=>setRange(r)} className={`rounded px-2.5 py-1 text-[10px] font-medium ${range===r ? "bg-[#d1a91c] text-[#101522]" : "text-[#8997ad] hover:text-white"}`}>{r.toUpperCase()}</button>)}</div></div>
        <Card className="py-4"><p className="text-[10px] font-semibold text-[#8795ad]">Estimated spend this cycle</p><div className="mt-1 flex items-end justify-between"><p className="font-serif text-2xl font-bold text-[#f9e8a3]">{formatMoney(Math.round(Number(latestInvoice?.totalAmountBilled || 0) * 100), "USD")}</p><span className="text-[10px] text-[#d67452]">▲ 12.4% from last cycle</span></div></Card>
        <div className="grid gap-3 md:grid-cols-3"><Metric label="API calls" value={formatNumber(usage?.apiCallsCount)} note="Total requests processed" /><Metric label="LLM tokens" value={formatNumber(usage?.llmTokensCount)} note="Across Gemini and Llama" /><Card className="py-4"><p className="text-[10px] font-semibold text-[#8795ad]">Quota used</p><div className="mt-1 flex items-center justify-between"><p className="font-mono text-lg font-bold text-[#f5f7fb]">{quota?.usagePercentage || 0}%</p><Badge variant={quotaStatus}>{quota?.status || "NORMAL"}</Badge></div><p className="mt-1 text-[10px] text-[#8290a8]">{formatNumber(quota?.currentUsage)} of {formatNumber(quota?.monthlyLimit)} units</p><div className="mt-2 h-1 overflow-hidden rounded bg-[#26344a]"><div className="h-full bg-[#52b89b]" style={{width:`${Math.min(Number(quota?.usagePercentage || 0),100)}%`}} /></div></Card></div>
        <div className="grid gap-3 lg:grid-cols-[1.65fr_1fr]"><Card><div className="mb-2"><h2 className="text-xs font-semibold text-[#dde5f1]">Hourly usage</h2><p className="text-[10px] text-[#8290a8]">Last 24 hours, all metrics combined</p></div><div className="h-52"><ResponsiveContainer width="100%" height="100%"><AreaChart data={usage?.hourlyUsage || []}><CartesianGrid vertical={false} stroke="#243149" /><XAxis dataKey="hour" tick={{fill:"#71809b",fontSize:10}} axisLine={false} tickLine={false}/><YAxis hide/><Tooltip contentStyle={{background:"#111a2a",border:"1px solid #35445d",fontSize:11}}/><defs><linearGradient id="usageFill" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#d1a91c" stopOpacity=".32"/><stop offset="95%" stopColor="#d1a91c" stopOpacity="0"/></linearGradient></defs><Area type="monotone" dataKey="units" stroke="#d1a91c" fill="url(#usageFill)" strokeWidth={1.5}/></AreaChart></ResponsiveContainer></div></Card><Card><h2 className="text-xs font-semibold text-[#dde5f1]">Monthly quota</h2><div className="mt-3 h-1.5 overflow-hidden rounded bg-[#26344a]"><div className="h-full bg-[#52b89b]" style={{width:`${Math.min(Number(quota?.usagePercentage || 0),100)}%`}} /></div><p className="mt-3 text-[10px] leading-4 text-[#c5cfde]">You’re at {quota?.usagePercentage || 0}% of your {quota?.tierName || "current"} allowance. We’ll email your team once you cross the alert threshold.</p><div className="mt-3 space-y-1 text-[10px]"><p className="text-[#e5bd36]">● Warning at {quota?.alertThresholdPercent || 80}%</p><p className="text-[#df6b57]">● Hard cap {quota?.hardCapEnabled ? "enabled" : "disabled"}</p></div></Card></div>
    </div>;
}
function Metric({label,value,note}) { return <Card className="py-4"><p className="text-[10px] font-semibold text-[#8795ad]">{label}</p><p className="mt-1 font-mono text-lg font-bold text-[#f5f7fb]">{value}</p><p className="mt-1 text-[10px] text-[#8290a8]">{note}</p></Card>; }
