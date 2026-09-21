import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { RoleRoute } from "../auth/RoleRoute";
import { AppShell } from "../components/layout/AppShell";

import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import Realtime from "../pages/Realtime";
import Quotas from "../pages/Quotas";
import Billing from "../pages/Billing";
import ApiKeys from "../pages/ApiKeys";
import Pricing from "../pages/admin/Pricing";
import Tenants from "../pages/admin/Tenants";
import Forbidden from "../pages/Forbidden";
import NotFound from "../pages/NotFound";

export const router = createBrowserRouter([
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
        path: "/",
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
                element: <Dashboard />,
            },
            {
                path: "dashboard/realtime",
                element: <Realtime />,
            },
            {
                path: "dashboard/quotas",
                element: <Quotas />,
            },
            {
                path: "dashboard/billing",
                element: <Billing />,
            },
            {
                path: "dashboard/api-keys",
                element: <ApiKeys />,
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
        ],
    },
    {
        path: "*",
        element: <NotFound />,
    },
]);
