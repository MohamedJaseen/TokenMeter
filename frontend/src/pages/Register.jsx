import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

function tenantSlug(value) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64);
}

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
    const [fieldErrors, setFieldErrors] = useState({});

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setFieldErrors({});

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (form.tenantName.trim().length < 2) {
            setError("Tenant name is required");
            return;
        }
        if (form.tenantName.trim().length > 255) {
            setError("Workspace name must be 255 characters or fewer");
            return;
        }
        if (form.username.trim().length < 3) {
            setError("Username must be at least 3 characters");
            return;
        }
        if (form.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        const generatedTenantId = tenantSlug(form.tenantId) || tenantSlug(form.tenantName) || "workspace";
        if (generatedTenantId.length < 2) {
            setError("Workspace ID must contain at least 2 letters or numbers");
            return;
        }

        setCreating(true);
        try {
            const data = await register({
                tenantId: generatedTenantId,
                tenantName: form.tenantName.trim(),
                username: form.username.trim(),
                email: form.email.trim() || null,
                password: form.password,
            });
            setResult(data);
        } catch (err) {
            setError(err?.message || "Registration failed. Please try again.");
            setFieldErrors(err?.fieldErrors || {});
        } finally {
            setCreating(false);
        }
    };

    if (result) {
        return (
            <div className="app-canvas flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md border-[#3b4a65]">
                    <div className="mb-6 text-center">
                        <h1 className="text-2xl font-bold text-[#f8f3d8]">Workspace created</h1>
                        <p className="text-sm text-[#a8b7cf]">
                            Your tenant <span className="font-mono font-semibold">{result.tenantId}</span> is ready.
                        </p>
                    </div>

                    <div className="mb-4 rounded-md border border-[#6d5d1e] bg-[#2b2612] p-4 text-sm text-[#f2d96b]">
                        <strong>Save this API key now!</strong> It will never be shown again. Use it as the{" "}
                        <code className="font-mono">X-API-KEY</code> header when calling the AI proxy.
                    </div>
                    <div className="mb-6 break-all rounded bg-[#0b1322] p-3 font-mono text-xs text-[#edf2fa]">
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
        <div className="app-canvas flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-lg border-[#3b4a65]">
                <div className="mb-7">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d1a91c]">TokenMeter</p>
                    <h1 className="mt-2 text-3xl font-bold text-[#f8f3d8]">Create your workspace</h1>
                    <p className="mt-2 text-sm leading-6 text-[#a8b7cf]">Start metering AI requests, quotas, telemetry, and billing in one place.</p>
                </div>

                {error && (
                    <div className="mb-4 rounded-md border border-[#7f3440] bg-[#2a1720] p-3 text-sm text-[#ffb5bd]">
                        <p className="font-semibold">{error}</p>
                        {Object.entries(fieldErrors).map(([field, message]) => (
                            <p key={field} className="mt-1">{field}: {message}</p>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#c7d1e0]">Company / Workspace name *</label>
                        <input
                            type="text"
                            name="tenantName"
                            value={form.tenantName}
                            onChange={handleChange}
                            className="form-input"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Workspace ID <span className="text-[#71809a]">(optional; generated from name)</span>
                        </label>
                        <input
                            type="text"
                            name="tenantId"
                            value={form.tenantId}
                            onChange={handleChange}
                            placeholder="auto-generated from name"
                            className="form-input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#c7d1e0]">Admin username *</label>
                        <input
                            type="text"
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            className="form-input"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#c7d1e0]">Contact email <span className="text-[#71809a]">(optional)</span></label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            className="form-input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#c7d1e0]">Password *</label>
                        <input
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            className="form-input"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#c7d1e0]">Confirm password *</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={form.confirmPassword}
                            onChange={handleChange}
                            className="form-input"
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