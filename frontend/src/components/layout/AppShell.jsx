import React, { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell() {
    const [isNavigationOpen, setIsNavigationOpen] = useState(false);
    const closeNavigation = useCallback(() => setIsNavigationOpen(false), []);

    return (
        <div className="app-canvas flex min-h-screen overflow-hidden">
            <Sidebar isOpen={isNavigationOpen} onClose={closeNavigation} />
            <div className="flex min-w-0 flex-1 flex-col">
                <Topbar onMenuClick={() => setIsNavigationOpen(true)} />
                <main className="page-enter min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
                    <div className="mx-auto w-full max-w-[1360px]">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
