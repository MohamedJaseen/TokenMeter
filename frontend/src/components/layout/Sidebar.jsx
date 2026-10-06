import React, { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { Activity, Cloud, Code2, Gauge, LayoutDashboard, Menu, Receipt, Search, Settings, SlidersHorizontal, Sparkles, Users, X, KeyRound } from "lucide-react";

const tenantNavigation = [
    { label: "Overview", to: "/dashboard", icon: LayoutDashboard, end: true },
    { label: "AI Playground", to: "/dashboard/playground", icon: Sparkles },
    { label: "Usage & quotas", to: "/dashboard/quotas", icon: Gauge },
    { label: "Telemetry", to: "/dashboard/realtime", icon: Activity },
];

const developerNavigation = [
    { label: "Invoices", to: "/dashboard/billing", icon: Receipt },
    { label: "API keys", to: "/dashboard/api-keys", icon: KeyRound },
    { label: "Python SDK", to: "/developer/sdk", icon: Code2 },
];

const adminNavigation = [
    { label: "Admin overview", to: "/dashboard/admin", icon: LayoutDashboard, end: true },
    { label: "Pricing", to: "/dashboard/admin/pricing", icon: SlidersHorizontal },
    { label: "Tenant management", to: "/dashboard/admin/tenants", icon: Users },
    { label: "Billing & invoices", to: "/dashboard/admin/invoices", icon: Receipt },
    { label: "Usage explorer", to: "/dashboard/admin/usage", icon: Search },
];

function NavigationItem({ item, onNavigate }) {
    const Icon = item.icon;
    return (
        <NavLink
            to={item.to}
            end={item.end}
            title={item.label}
            onClick={onNavigate}
            className={({ isActive }) => `group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                isActive
                    ? "bg-[#d6b65e]/10 text-[#e7c86d] ring-1 ring-inset ring-[#d6b65e]/20"
                    : "text-[#a8b5c5] hover:bg-[#1a2735] hover:text-[#eef3f8]"
            }`}
        >
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
        </NavLink>
    );
}

function SidebarContent({ isSuperAdmin, tenantId, onNavigate }) {
    return (
        <div className="flex h-full flex-col px-3 py-4">
            <div className="flex items-center gap-3 px-2 py-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#d6b65e]/25 bg-[#d6b65e]/10 text-[#e7c86d]">
                    <Cloud aria-hidden="true" className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                    <span className="block text-sm font-semibold tracking-tight text-[#edf2f8]">TokenMeter</span>
                    <span className="mt-0.5 block text-[10px] text-[#8392a5]">{isSuperAdmin ? "Platform control" : "AI usage platform"}</span>
                </span>
            </div>

            <nav aria-label={isSuperAdmin ? "Administration" : "Workspace"} className="mt-7 flex-1 space-y-6">
                {isSuperAdmin ? (
                    <div className="space-y-1">
                        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[.14em] text-[#708095]">Administration</p>
                        {adminNavigation.map((item) => <NavigationItem key={item.to} item={item} onNavigate={onNavigate} />)}
                    </div>
                ) : (
                    <>
                        <div className="space-y-1">
                            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[.14em] text-[#708095]">Workspace</p>
                            {tenantNavigation.map((item) => <NavigationItem key={item.to} item={item} onNavigate={onNavigate} />)}
                        </div>
                        <div className="space-y-1">
                            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[.14em] text-[#708095]">Billing & developer</p>
                            {developerNavigation.map((item) => <NavigationItem key={item.to} item={item} onNavigate={onNavigate} />)}
                        </div>
                    </>
                )}
            </nav>

            <div className="border-t border-[#263445] pt-3">
                <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-[#a8b5c5]">
                    <Settings aria-hidden="true" className="h-4 w-4 text-[#8292a6]" />
                    <span>{isSuperAdmin ? "Platform settings" : "Workspace settings"}</span>
                </div>
                <p className="mt-2 truncate px-3 text-[10px] text-[#718197]" title={tenantId}>
                    {isSuperAdmin ? "Super administrator" : tenantId || "Current workspace"}
                </p>
            </div>
        </div>
    );
}

export function Sidebar({ isOpen = false, onClose = () => {} }) {
    const { user } = useAuth();
    const location = useLocation();
    const mobileDrawerRef = useRef(null);
    const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN");

    useEffect(() => {
        onClose();
    }, [location.pathname]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const previousFocus = document.activeElement;
        const firstFocusable = mobileDrawerRef.current?.querySelector(
            'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
        );
        firstFocusable?.focus();
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose();
                return;
            }
            if (event.key !== "Tab") return;
            const focusable = mobileDrawerRef.current?.querySelectorAll(
                'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
            );
            if (!focusable?.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, [isOpen, onClose]);

    return (
        <>
            <aside className="sticky top-0 hidden h-screen w-[252px] shrink-0 border-r border-[#263445] bg-[#0e1722] lg:flex lg:flex-col">
                <SidebarContent isSuperAdmin={isSuperAdmin} tenantId={user?.tenantId} />
            </aside>
            {isOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <button className="absolute inset-0 h-full w-full bg-black/65" aria-label="Close navigation menu" onClick={onClose} />
                    <aside ref={mobileDrawerRef} role="dialog" aria-modal="true" aria-label="Workspace navigation" tabIndex={-1} className="page-enter relative flex h-full w-[min(84vw,300px)] flex-col border-r border-[#314155] bg-[#0e1722] shadow-2xl">
                        <div className="flex justify-end px-3 pt-3">
                            <button className="rounded-lg p-2 text-[#a8b5c5] hover:bg-[#1a2735] hover:text-white" onClick={onClose} aria-label="Close navigation menu">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto">
                            <SidebarContent isSuperAdmin={isSuperAdmin} tenantId={user?.tenantId} onNavigate={onClose} />
                        </div>
                    </aside>
                </div>
            )}
        </>
    );
}

export function MobileMenuButton({ onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="mr-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#304155] text-[#cbd5e1] hover:bg-[#1a2735] focus-visible:outline"
            aria-label="Open navigation menu"
            aria-haspopup="true"
        >
            <Menu className="h-4 w-4" />
        </button>
    );
}
