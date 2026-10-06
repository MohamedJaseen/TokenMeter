import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminInvoices, fetchAdminPricing, fetchAdminTenants, searchAdminUsageEvents } from "../../api/endpoints/admin";
import { Card } from "../../components/ui/Card";
import { ErrorState } from "../../components/ui/ErrorState";
import { Skeleton } from "../../components/ui/Skeleton";
import { formatMoney, formatNumber } from "../../lib/format";

function ControlLink({ to, title, description }) {
    return (
        <Link to={to} className="block rounded-md border border-[#2b3a53] bg-[#101827] p-4 transition hover:border-[#d1a91c]">
            <h3 className="text-sm font-semibold text-[#e5ebf5]">{title}</h3>
            <p className="mt-1 text-xs leading-5 text-[#8290a8]">{description}</p>
        </Link>
    );
}

export default function AdminOverview() {
    const tenantsQuery = useQuery({
        queryKey: ["adminTenants"],
        queryFn: fetchAdminTenants,
    });
    const pricingQuery = useQuery({
        queryKey: ["adminPricing"],
        queryFn: fetchAdminPricing,
    });
    const invoicesQuery = useQuery({
        queryKey: ["adminInvoices", "overview"],
        queryFn: () => fetchAdminInvoices(),
    });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const eventsQuery = useQuery({
        queryKey: ["adminUsageEvents", "today"],
        queryFn: () => searchAdminUsageEvents({
            from: todayStart.toISOString(),
            limit: 500,
        }),
    });

    const tenants = tenantsQuery.data;
    const pricing = pricingQuery.data;
    const tenantsInAlert = tenants?.filter((tenant) =>
        tenant.quotaStatus === "WARNING" || tenant.quotaStatus === "EXCEEDED").length;
    const activeTenants = tenants?.filter((tenant) => tenant.tenantStatus === "ACTIVE").length;
    const totalUsage = tenants?.reduce(
        (sum, tenant) => sum + Number(tenant.currentUsage || 0),
        0);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const paidRevenueThisMonth = (invoicesQuery.data || [])
        .filter((invoice) => invoice.paymentStatus === "PAID" && invoice.billingPeriodStart.startsWith(thisMonth))
        .reduce((sum, invoice) => sum + Number(invoice.totalAmountBilled || 0), 0);

    return (
        <div className="space-y-5">
            <header>
                <h1 className="font-serif text-xl font-bold text-[#f1d766]">Platform control center</h1>
                <p className="mt-1 text-[11px] text-[#8290a8]">Manage global billing rules and review tenant quota health.</p>
            </header>

            {tenantsQuery.isLoading ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                </div>
            ) : tenantsQuery.error ? (
                <ErrorState message={tenantsQuery.error.message || "Failed to load platform tenant data."} onRetry={tenantsQuery.refetch} />
            ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <Card>
                        <p className="text-[10px] font-semibold uppercase text-[#8795ad]">Active tenants</p>
                        <p className="mt-2 font-mono text-xl font-bold text-[#f5f7fb]">{formatNumber(activeTenants)}</p>
                    </Card>
                    <Card>
                        <p className="text-[10px] font-semibold uppercase text-[#8795ad]">Total tenants</p>
                        <p className="mt-2 font-mono text-xl font-bold text-[#f5f7fb]">{formatNumber(tenants.length)}</p>
                    </Card>
                    <Card>
                        <p className="text-[10px] font-semibold uppercase text-[#8795ad]">Tenants with quota alerts</p>
                        <p className="mt-2 font-mono text-xl font-bold text-[#f5f7fb]">{formatNumber(tenantsInAlert)}</p>
                    </Card>
                    <Card>
                        <p className="text-[10px] font-semibold uppercase text-[#8795ad]">Reported quota usage</p>
                        <p className="mt-2 font-mono text-xl font-bold text-[#f5f7fb]">{formatNumber(totalUsage)} units</p>
                    </Card>
                    <Card>
                        <p className="text-[10px] font-semibold uppercase text-[#8795ad]">Paid revenue this month</p>
                        <p className="mt-2 font-mono text-xl font-bold text-[#f5f7fb]">{invoicesQuery.isLoading ? "…" : formatMoney(Math.round(paidRevenueThisMonth * 100))}</p>
                    </Card>
                </div>
            )}

            <Card>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-sm font-semibold text-[#e5ebf5]">Platform pricing</h2>
                        <p className="mt-1 text-xs text-[#8290a8]">Current global rates used by billing.</p>
                    </div>
                    <Link to="/dashboard/admin/pricing" className="text-xs font-semibold text-[#e5bd36] hover:text-[#f1d766]">Manage pricing</Link>
                </div>
                {pricingQuery.isLoading ? (
                    <Skeleton className="mt-4 h-12" />
                ) : pricingQuery.error ? (
                    <p role="alert" className="mt-4 text-xs text-[#f0a18d]">{pricingQuery.error.message || "Failed to load global pricing."}</p>
                ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-md bg-[#101827] p-3">
                            <p className="text-[10px] text-[#8795ad]">Per 1,000 LLM tokens</p>
                            <p className="mt-1 font-mono text-sm font-semibold text-[#f5f7fb]">₹{Number(pricing.pricePer1kTokens).toFixed(4)}</p>
                        </div>
                        <div className="rounded-md bg-[#101827] p-3">
                            <p className="text-[10px] text-[#8795ad]">Per 1,000 API calls</p>
                            <p className="mt-1 font-mono text-sm font-semibold text-[#f5f7fb]">₹{Number(pricing.pricePer1kApiCalls).toFixed(4)}</p>
                        </div>
                    </div>
                )}
            </Card>

            <section>
                <h2 className="mb-3 text-sm font-semibold text-[#e5ebf5]">Platform administration</h2>
                <div className="grid gap-3 md:grid-cols-2">
                    <ControlLink
                        to="/dashboard/admin/tenants"
                        title="Tenant management"
                        description="Review tenant quota usage, plan tier, limits, and quota status."
                    />
                    <ControlLink
                        to="/dashboard/admin/pricing"
                        title="Global pricing"
                        description="Configure the platform-wide token and API-call rates."
                    />
                    <ControlLink
                        to="/dashboard/admin/invoices"
                        title="Billing & invoices"
                        description="Search the invoice ledger, update payment status, generate invoices, and export CSV."
                    />
                    <ControlLink
                        to="/dashboard/admin/usage"
                        title="Usage explorer"
                        description={`${eventsQuery.isLoading ? "Loading today's processed events…" : `${formatNumber(eventsQuery.data?.length)} processed events recorded today.`} Filter the metering ledger by tenant and metric.`}
                    />
                </div>
            </section>

            <Card>
                <h2 className="text-sm font-semibold text-[#e5ebf5]">Operational visibility limitations</h2>
                <p className="mt-1 text-xs leading-5 text-[#8290a8]">
                    Processed usage events and the invoice ledger are available above. Duplicate requests rejected before
                    processing, pending/failed Redis stream entries, a plan catalog, payment-provider reconciliation,
                    and Redis/PostgreSQL/worker health do not yet have platform admin APIs.
                </p>
            </Card>
        </div>
    );
}
