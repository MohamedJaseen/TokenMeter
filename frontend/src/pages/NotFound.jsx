import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export default function NotFound() {
    return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
            <h1 className="text-6xl font-bold text-gray-900">404</h1>
            <h2 className="mt-4 text-xl font-semibold text-gray-700">Page Not Found</h2>
            <p className="mt-2 text-sm text-gray-500">The page you are looking for does not exist.</p>
            <div className="mt-6">
                <Link to="/dashboard">
                    <Button>Return to Dashboard</Button>
                </Link>
            </div>
        </div>
    );
}
