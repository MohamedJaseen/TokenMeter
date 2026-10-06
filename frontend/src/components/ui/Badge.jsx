import React from "react";
import { cn } from "./Button";
export function Badge({ children, variant = "success", className, ...props }) {
    const variants = {
        success: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
        warning: "border-amber-300/30 bg-amber-300/10 text-amber-200",
        danger: "border-rose-400/30 bg-rose-400/10 text-rose-200",
        info: "border-sky-300/25 bg-sky-300/10 text-sky-200",
    };
    return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide", variants[variant] || variants.info, className)} {...props}>{children}</span>;
}
