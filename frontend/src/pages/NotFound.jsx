import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <div className="app-canvas flex min-h-screen flex-col items-center justify-center p-4 text-center">
            <div className="glass-card w-full max-w-lg p-8 sm:p-10">
                <p className="font-mono text-5xl font-semibold tracking-tight text-[#e7c86d]">404</p>
                <h1 className="mt-4 text-xl font-semibold text-[#e7edf6]">Page not found</h1>
                <p className="mt-2 text-sm leading-6 text-[#9aa9bb]">The page you are looking for does not exist.</p>
                <Link to="/dashboard" className="mt-6 inline-flex min-h-10 items-center justify-center rounded-lg bg-[#d6b65e] px-4 py-2 text-xs font-semibold text-[#141820] transition hover:bg-[#e7c86d]">
                    Return to dashboard
                </Link>
            </div>
        </div>
    );
}
