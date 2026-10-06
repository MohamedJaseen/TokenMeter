import React from "react";

export function Skeleton({ className = "h-4 w-full" }) {
    return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-[#1b2939] ${className}`} />;
}
