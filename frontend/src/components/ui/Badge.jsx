import React from "react";
import { cn } from "./Button";
export function Badge({ children, variant = "success", className }) { const variants={success:"border-emerald-400/30 bg-emerald-400/10 text-emerald-300",warning:"border-[#d1a91c]/35 bg-[#d1a91c]/10 text-[#edcf58]",danger:"border-red-400/30 bg-red-400/10 text-red-300",info:"border-sky-400/30 bg-sky-400/10 text-sky-300"}; return <span className={cn("inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-semibold",variants[variant],className)}>{children}</span>; }
