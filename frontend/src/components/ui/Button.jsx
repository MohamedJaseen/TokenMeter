import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) { return twMerge(clsx(inputs)); }
export function Button({ children, variant = "primary", className, ...props }) { const base = "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold transition focus:outline-none disabled:pointer-events-none disabled:opacity-50"; const variants = { primary:"bg-[#d1a91c] text-[#101522] hover:bg-[#e3bd2c]", secondary:"bg-[#202c41] text-[#e5ebf5] hover:bg-[#2b3850]", danger:"bg-[#8e3333] text-white hover:bg-[#aa4141]", outline:"border border-[#35445d] bg-transparent text-[#c9d3e3] hover:bg-[#182238]" }; return <button className={cn(base, variants[variant], className)} {...props}>{children}</button>; }
