import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { RoleRoute } from "../auth/RoleRoute";
import { useAuth } from "../auth/useAuth";
import { AppShell } from "../components/layout/AppShell";

import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Realtime from "../pages/Realtime";
import Quotas from "../pages/Quotas";
import Billing from "../pages/Billing";
import ApiKeys from "../pages/ApiKeys";
import AiPlayground from "../pages/AiPlayground";
import LandingPage from "../pages/LandingPage";
import DeveloperSdkPage from "../pages/DeveloperSdkPage";
import Pricing from "../pages/admin/Pricing";
import Tenants from "../pages/admin/Tenants";
import AdminOverview from "../pages/admin/Overview";
import AdminInvoices from "../pages/admin/Invoices";
import AdminUsageExplorer from "../pages/admin/UsageExplorer";
import Forbidden from "../pages/Forbidden";
import NotFound from "../pages/NotFound";

function DashboardHome() {
    const { user } = useAuth();
    return user?.roles?.includes("SUPER_ADMIN")
        ? <Navigate to="/dashboard/admin" replace />
        : <Dashboard />;
}

function TenantOnly({ children }) {
    return <RoleRoute forbiddenRole="SUPER_ADMIN">{children}</RoleRoute>;
}

export const router = createBrowserRouter([
    {
        path: "/",
        element: <LandingPage />,
    },
    {
        path: "/playground",
        element: <AiPlayground />,
    },
    {
        path: "/developer/sdk",
        element: <DeveloperSdkPage />,
    },
    {
        path: "/docs",
        element: <DeveloperSdkPage />,
    },
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/register",
        element: <Register />,
    },
    {
        path: "/403",
        element: <Forbidden />,
    },
    {
        path: "/app",
        element: (
            <ProtectedRoute>
                <AppShell />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <Navigate to="/dashboard" replace />,
            },
            {
                path: "dashboard",
                element: <TenantOnly><Dashboard /></TenantOnly>,
            },
            {
                path: "dashboard/realtime",
                element: <TenantOnly><Realtime /></TenantOnly>,
            },
            {
                path: "dashboard/quotas",
                element: <TenantOnly><Quotas /></TenantOnly>,
            },
            {
                path: "dashboard/billing",
                element: <TenantOnly><Billing /></TenantOnly>,
            },
            {
                path: "dashboard/api-keys",
                element: <TenantOnly><ApiKeys /></TenantOnly>,
            },
            {
                path: "admin",
                element: <RoleRoute requiredRole="SUPER_ADMIN"><AdminOverview /></RoleRoute>,
            },
            {
                path: "admin/pricing",
                element: (
                    <RoleRoute requiredRole="SUPER_ADMIN">
                        <Pricing />
                    </RoleRoute>
                ),
            },
            {
                path: "admin/tenants",
                element: (
                    <RoleRoute requiredRole="SUPER_ADMIN">
                        <Tenants />
                    </RoleRoute>
                ),
            },
            { path: "admin/invoices", element: <RoleRoute requiredRole="SUPER_ADMIN"><AdminInvoices /></RoleRoute> },
            { path: "admin/usage", element: <RoleRoute requiredRole="SUPER_ADMIN"><AdminUsageExplorer /></RoleRoute> },
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
            { path: "realtime", element: <TenantOnly><Realtime /></TenantOnly> },
            { path: "quotas", element: <TenantOnly><Quotas /></TenantOnly> },
            { path: "billing", element: <TenantOnly><Billing /></TenantOnly> },
            { path: "api-keys", element: <TenantOnly><ApiKeys /></TenantOnly> },
            { path: "admin", element: <RoleRoute requiredRole="SUPER_ADMIN"><AdminOverview /></RoleRoute> },
            { path: "admin/pricing", element: <RoleRoute requiredRole="SUPER_ADMIN"><Pricing /></RoleRoute> },
            { path: "admin/tenants", element: <RoleRoute requiredRole="SUPER_ADMIN"><Tenants /></RoleRoute> },
            { path: "admin/invoices", element: <RoleRoute requiredRole="SUPER_ADMIN"><AdminInvoices /></RoleRoute> },
            { path: "admin/usage", element: <RoleRoute requiredRole="SUPER_ADMIN"><AdminUsageExplorer /></RoleRoute> },
        ],
    },
    {
        path: "*",
        element: <NotFound />,
    },
]);
