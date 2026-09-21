import React from "react";

export function Skeleton({ className = "h-4 w-full" }) {
    return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}
