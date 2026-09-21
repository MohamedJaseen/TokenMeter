import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export function RoleRoute({ children, requiredRole }) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">Checking permissions...</div>;
    }

    if (!user || !user.roles.includes(requiredRole)) {
        return <Navigate to="/403" replace />;
    }

    return children;
}
