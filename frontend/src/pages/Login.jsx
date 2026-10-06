import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export default function Login() {
    const [username, setUsername] = useState("tenantA_admin");
    const [password, setPassword] = useState("password");
    const [error, setError] = useState(null);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || "/dashboard";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            await login(username, password);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message || "Invalid credentials");
        }
    };

    return (
        <div className="app-canvas flex min-h-screen items-center justify-center p-4 sm:p-6">
            <Card className="w-full max-w-md p-6 sm:p-8">
                <div className="mb-6 text-center">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-[#d6b65e]">TokenMeter</p>
                    <h1 className="text-2xl font-semibold tracking-tight text-gray-900">MeterFlow Sign In</h1>
                    <p className="mt-1 text-sm text-gray-500">API metering & billing platform</p>
                </div>
                {error && <div role="alert" className="mb-4 rounded-lg border border-rose-400/25 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="login-username" className="block text-sm font-medium text-gray-700">Username</label>
                        <input
                            id="login-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            className="form-input"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            className="form-input"
                            required
                        />
                    </div>
                    <Button type="submit" className="w-full">Sign In</Button>
                </form>
                <p className="mt-4 text-center text-sm text-gray-500">
                    New tenant?{" "}
                    <Link to="/register" className="font-medium text-blue-600 hover:underline">
                        Create an account
                    </Link>
                </p>
            </Card>
        </div>
    );
}
