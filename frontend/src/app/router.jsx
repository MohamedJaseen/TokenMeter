import React, { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { RoleRoute } from "../auth/RoleRoute";
import { useAuth } from "../auth/useAuth";
import { AppShell } from "../components/layout/AppShell";
import { Skeleton } from "../components/ui/Skeleton";

const Dashboard = lazy(() => import("../pages/Dashboard"));
const Realtime = lazy(() => import("../pages/Realtime"));
const Quotas = lazy(() => import("../pages/Quotas"));
const Billing = lazy(() => import("../pages/Billing"));
const ApiKeys = lazy(() => import("../pages/ApiKeys"));
const AiPlayground = lazy(() => import("../pages/AiPlayground"));
const LandingPage = lazy(() => import("../pages/LandingPage"));
const DeveloperSdkPage = lazy(() => import("../pages/DeveloperSdkPage"));
const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const Pricing = lazy(() => import("../pages/admin/Pricing"));
const Tenants = lazy(() => import("../pages/admin/Tenants"));
const AdminOverview = lazy(() => import("../pages/admin/Overview"));
const AdminInvoices = lazy(() => import("../pages/admin/Invoices"));
const AdminUsageExplorer = lazy(() => import("../pages/admin/UsageExplorer"));
const Forbidden = lazy(() => import("../pages/Forbidden"));
const NotFound = lazy(() => import("../pages/NotFound"));

function RouteLoading() {
    return (
        <div className="app-canvas min-h-screen p-5 sm:p-8" role="status" aria-live="polite">
            <span className="sr-only">Loading page</span>
            <div className="mx-auto max-w-6xl space-y-4">
                <Skeleton className="h-12 w-2/5" />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
                <Skeleton className="h-72" />
            </div>
        </div>
    );
}

function page(Component) {
    return <Suspense fallback={<RouteLoading />}><Component /></Suspense>;
}

function DashboardHome() {
    const { user } = useAuth();
    return user?.roles?.includes("SUPER_ADMIN")
        ? <Navigate to="/dashboard/admin" replace />
        : page(Dashboard);
}

function TenantOnly({ children }) {
    return <RoleRoute forbiddenRole="SUPER_ADMIN">{children}</RoleRoute>;
}

function TenantPage({ component: Component }) {
    return <TenantOnly>{page(Component)}</TenantOnly>;
}

function AdminPage({ component: Component }) {
    return <RoleRoute requiredRole="SUPER_ADMIN">{page(Component)}</RoleRoute>;
}

export const router = createBrowserRouter([
    { path: "/", element: page(LandingPage) },
    { path: "/playground", element: page(AiPlayground) },
    { path: "/developer/sdk", element: page(DeveloperSdkPage) },
    { path: "/docs", element: page(DeveloperSdkPage) },
    { path: "/login", element: page(Login) },
    { path: "/register", element: page(Register) },
    { path: "/403", element: page(Forbidden) },
    {
        path: "/app",
        element: (
            <ProtectedRoute>
                <AppShell />
            </ProtectedRoute>
        ),
        children: [
            { index: true, element: <Navigate to="/dashboard" replace /> },
            { path: "dashboard", element: <TenantPage component={Dashboard} /> },
            { path: "dashboard/realtime", element: <TenantPage component={Realtime} /> },
            { path: "dashboard/quotas", element: <TenantPage component={Quotas} /> },
            { path: "dashboard/billing", element: <TenantPage component={Billing} /> },
            { path: "dashboard/api-keys", element: <TenantPage component={ApiKeys} /> },
            { path: "admin", element: <AdminPage component={AdminOverview} /> },
            { path: "admin/pricing", element: <AdminPage component={Pricing} /> },
            { path: "admin/tenants", element: <AdminPage component={Tenants} /> },
            { path: "admin/invoices", element: <AdminPage component={AdminInvoices} /> },
            { path: "admin/usage", element: <AdminPage component={AdminUsageExplorer} /> },
        ],
    },
    {
        path: "/dashboard",
        element: (
            <ProtectedRoute>
                <AppShell />
            </ProtectedRoute>
        ),
        children: [
            { index: true, element: <DashboardHome /> },
            { path: "realtime", element: <TenantPage component={Realtime} /> },
            { path: "quotas", element: <TenantPage component={Quotas} /> },
            { path: "billing", element: <TenantPage component={Billing} /> },
            { path: "api-keys", element: <TenantPage component={ApiKeys} /> },
            { path: "admin", element: <AdminPage component={AdminOverview} /> },
            { path: "admin/pricing", element: <AdminPage component={Pricing} /> },
            { path: "admin/tenants", element: <AdminPage component={Tenants} /> },
            { path: "admin/invoices", element: <AdminPage component={AdminInvoices} /> },
            { path: "admin/usage", element: <AdminPage component={AdminUsageExplorer} /> },
        ],
    },
    { path: "*", element: page(NotFound) },
]);
