import React from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Outlet } from "react-router-dom";
export function AppShell() { return <div className="app-canvas flex min-h-screen overflow-hidden"><Sidebar /><div className="flex min-w-0 flex-1 flex-col overflow-hidden"><Topbar /><main className="page-enter flex-1 overflow-y-auto px-4 py-6 sm:px-8 lg:px-12"><div className="mx-auto w-full max-w-[1120px]"><Outlet /></div></main></div></div>; }
