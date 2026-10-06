import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export function RoleRoute({ children, requiredRole, forbiddenRole }) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">Checking permissions...</div>;
    }

    if (!user || (requiredRole && !user.roles.includes(requiredRole))) {
        return <Navigate to="/403" replace />;
    }

    if (forbiddenRole && user.roles.includes(forbiddenRole)) {
        return <Navigate to="/dashboard/admin" replace />;
    }

    return children;
}
