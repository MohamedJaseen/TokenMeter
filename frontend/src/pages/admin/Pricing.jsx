import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAdminPricing, updateAdminPricing } from "../../api/endpoints/admin";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { ErrorState } from "../../components/ui/ErrorState";

export default function Pricing() {
    const queryClient = useQueryClient();
    const [successMsg, setSuccessMsg] = useState("");

    const { data: pricing, isLoading, error, refetch } = useQuery({
        queryKey: ["adminPricing"],
        queryFn: fetchAdminPricing,
    });

    const [form, setForm] = useState({
        pricePer1kTokens: 0.002,
        pricePer1kApiCalls: 0.005,
    });

    React.useEffect(() => {
        if (pricing) {
            setForm({
                pricePer1kTokens: pricing.pricePer1kTokens || 0.002,
                pricePer1kApiCalls: pricing.pricePer1kApiCalls || 0.005,
            });
        }
    }, [pricing]);

    const mutation = useMutation({
        mutationFn: updateAdminPricing,
        onSuccess: () => {
            queryClient.invalidateQueries(["adminPricing"]);
            setSuccessMsg("Global pricing updated successfully.");
            setTimeout(() => setSuccessMsg(""), 4000);
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate(form);
    };

    if (isLoading) return <Skeleton className="h-64" />;
    if (error) return <ErrorState message="Failed to load pricing configuration." onRetry={refetch} />;

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Global Pricing Administration</h1>
                <p className="text-sm text-gray-500">Configure platform-wide unit rates for tokens and API calls (SUPER_ADMIN only).</p>
            </div>

            {successMsg && <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">{successMsg}</div>}

            <Card>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Price per 1,000 LLM Tokens ($)</label>
                        <input
                            type="number"
                            step="0.0001"
                            value={form.pricePer1kTokens}
                            onChange={(e) => setForm({ ...form, pricePer1kTokens: Number(e.target.value) })}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none tabular-nums"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Price per 1,000 API Calls ($)</label>
                        <input
                            type="number"
                            step="0.0001"
                            value={form.pricePer1kApiCalls}
                            onChange={(e) => setForm({ ...form, pricePer1kApiCalls: Number(e.target.value) })}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none tabular-nums"
                            required
                        />
                    </div>
                    <div className="pt-4">
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? "Saving..." : "Update Global Pricing"}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
