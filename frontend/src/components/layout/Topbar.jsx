import React from "react";
import { useAuth } from "../../auth/useAuth";
import { Button } from "../ui/Button";
import { CircleHelp } from "lucide-react";
export function Topbar() { const { user, logout } = useAuth(); return <header className="flex h-14 items-center justify-between border-b border-[#263249] bg-[#0d1421] px-4 sm:px-6"><span className="rounded border border-[#33425c] bg-[#141e30] px-2 py-1 text-[10px] font-medium text-[#d7deeb]">{user?.tenantId || "Acme Corp"}</span><div className="flex items-center gap-3"><span className="hidden text-[11px] text-[#8e9bb0] sm:block">{user?.sub || "User"}</span><CircleHelp className="h-3.5 w-3.5 text-[#8e9bb0]" /><Button variant="outline" className="px-2.5 py-1 text-[10px]" onClick={logout}>Sign out</Button></div></header>; }
