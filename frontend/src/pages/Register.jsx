import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        tenantId: "",
        tenantName: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState(null);
    const [creating, setCreating] = useState(false);
    const [result, setResult] = useState(null);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (form.tenantName.length < 2) {
            setError("Tenant name is required");
            return;
        }

        setCreating(true);
        try {
            const data = await register({
                tenantId: form.tenantId.trim(),
                tenantName: form.tenantName,
                username: form.username,
                email: form.email,
                password: form.password,
            });
            setResult(data);
        } catch (err) {
            setError(err?.message || "Registration failed. Please try again.");
        } finally {
            setCreating(false);
        }
    };

    if (result) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-gray-100 p-4">
                <Card className="w-full max-w-md">
                    <div className="mb-6 text-center">
                        <h1 className="text-2xl font-bold text-gray-900">Tenant Created</h1>
                        <p className="text-sm text-gray-500">
                            Your tenant <span className="font-mono font-semibold">{result.tenantId}</span> is ready.
                        </p>
                    </div>

                    <div className="rounded-md bg-amber-50 p-4 border border-amber-200 text-amber-800 text-sm mb-4">
                        <strong>Save this API key now!</strong> It will never be shown again. Use it as the{" "}
                        <code className="font-mono">X-API-KEY</code> header when calling the AI proxy.
                    </div>
                    <div className="rounded bg-gray-100 p-3 font-mono text-xs text-gray-900 break-all mb-6">
                        {result.apiKey}
                    </div>

                    <div className="flex justify-center">
                        <Button onClick={() => navigate("/login")}>
                            Continue to Sign In
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-gray-100 p-4">
            <Card className="w-full max-w-md">
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Create Tenant Account</h1>
                    <p className="text-sm text-gray-500">Register a new tenant on the MeterFlow platform</p>
                </div>

                {error && (
                    <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Company / Tenant Name *</label>
                        <input
                            type="text"
                            name="tenantName"
                            value={form.tenantName}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Tenant ID <span className="text-gray-400">(optional, lower-case)</span>
                        </label>
                        <input
                            type="text"
                            name="tenantId"
                            value={form.tenantId}
                            onChange={handleChange}
                            placeholder="auto-generated from name"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Admin Username *</label>
                        <input
                            type="text"
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password *</label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirm Password *</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={creating}>
                        {creating ? "Creating tenant..." : "Create Tenant"}
                    </Button>
                </form>

                <p className="mt-4 text-center text-sm text-gray-500">
                    Already have an account?{" "}
                    <Link to="/login" className="font-medium text-blue-600 hover:underline">
                        Sign in
                    </Link>
                </p>
            </Card>
        </div>
    );
}