import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) { return twMerge(clsx(inputs)); }
export function Button({ children, variant = "primary", className, ...props }) {
    const base = "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7c86d] disabled:pointer-events-none disabled:opacity-50";
    const variants = {
        primary: "bg-[#d6b65e] text-[#141820] hover:bg-[#e7c86d] active:bg-[#c4a54f]",
        secondary: "border border-[#304155] bg-[#1a2736] text-[#e0e8f1] hover:border-[#465b72] hover:bg-[#202f40]",
        danger: "border border-[#713f45] bg-[#48282d] text-[#ffd9d9] hover:bg-[#5b3036]",
        outline: "border border-[#35465b] bg-transparent text-[#c9d3df] hover:border-[#50647b] hover:bg-[#182332]",
    };
    return <button className={cn(base, variants[variant], className)} {...props}>{children}</button>;
}
