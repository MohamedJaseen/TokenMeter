import React from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { Button } from "../ui/Button";
import { MobileMenuButton } from "./Sidebar";

const pageTitles = [
    ["/dashboard/admin/tenants", "Tenant management"],
    ["/dashboard/admin/invoices", "Billing & invoices"],
    ["/dashboard/admin/pricing", "Global pricing"],
    ["/dashboard/admin/usage", "Usage explorer"],
    ["/dashboard/admin", "Platform overview"],
    ["/dashboard/quotas", "Usage & quotas"],
    ["/dashboard/playground", "AI Playground"],
    ["/dashboard/realtime", "Telemetry"],
    ["/dashboard/billing", "Invoices"],
    ["/dashboard/api-keys", "API keys"],
    ["/dashboard", "Overview"],
    ["/playground", "AI Playground"],
];

export function Topbar({ onMenuClick }) {
    const { user, logout } = useAuth();
    const { pathname } = useLocation();
    const title = pageTitles.find(([path]) => pathname === path)?.[1] || "TokenMeter";
    const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN");

    return (
        <header className="sticky top-0 z-20 flex min-h-[64px] items-center justify-between border-b border-[#263445] bg-[#0d1520]/95 px-4 backdrop-blur-md sm:px-6">
            <div className="flex min-w-0 items-center">
                <div className="lg:hidden"><MobileMenuButton onClick={onMenuClick} /></div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#e7edf6]">{title}</p>
                    <p className="mt-0.5 hidden truncate text-[10px] text-[#77869a] sm:block">
                        {isSuperAdmin ? "Platform administration" : user?.tenantId || "Workspace"}
                    </p>
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <span className="hidden max-w-[180px] truncate rounded-full border border-[#2b3b4e] bg-[#121d2a] px-3 py-1.5 text-[11px] text-[#aebaca] md:inline-flex" title={user?.tenantId || "Workspace"}>
                    {isSuperAdmin ? "Super Admin" : user?.tenantId || "Workspace"}
                </span>
                <span className="hidden max-w-[150px] truncate text-xs text-[#8998aa] xl:block" title={user?.sub || "Signed in user"}>
                    {user?.sub || "Signed in"}
                </span>
                <Button variant="outline" className="min-h-8 px-3 py-1.5 text-[11px]" onClick={logout}>Sign out</Button>
            </div>
        </header>
    );
}
