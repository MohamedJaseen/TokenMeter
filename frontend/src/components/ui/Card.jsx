import React from "react";
import { cn } from "./Button";
export function Card({ children, className, ...props }) { return <div className={cn("glass-card rounded-md p-4 sm:p-5", className)} {...props}>{children}</div>; }
