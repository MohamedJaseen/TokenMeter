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
    const [mutationError, setMutationError] = useState("");

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
            setMutationError("");
            setTimeout(() => setSuccessMsg(""), 4000);
        },
        onError: (error) => setMutationError(error?.response?.data?.message || error.message || "Could not update global pricing."),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate(form);
    };

    if (isLoading) return <Skeleton className="h-64" />;
    if (error) return <ErrorState message="Failed to load pricing configuration." onRetry={refetch} />;

    return (
        <div className="max-w-3xl space-y-6 sm:space-y-8">
            <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.13em] text-[#9aabc0]">Platform controls</p>
                <h1 className="text-2xl font-semibold tracking-tight text-[#edf2f8]">Global pricing</h1>
                <p className="mt-2 text-sm leading-6 text-[#91a0b2]">Configure platform-wide rates for token and API-call usage. Changes apply to invoice calculations.</p>
            </div>

            {successMsg && <div role="status" className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-200">{successMsg}</div>}
            {mutationError && <div role="alert" className="rounded-lg border border-rose-400/25 bg-rose-400/5 p-4 text-sm text-rose-200">{mutationError}</div>}

            <Card>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="price-per-1k-tokens" className="block text-sm font-medium text-gray-700">Price per 1,000 LLM tokens ($)</label>
                        <input
                            id="price-per-1k-tokens"
                            type="number"
                            min="0"
                            step="0.0001"
                            value={form.pricePer1kTokens}
                            onChange={(e) => setForm({ ...form, pricePer1kTokens: Number(e.target.value) })}
                            className="form-input tabular-nums"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="price-per-1k-api-calls" className="block text-sm font-medium text-gray-700">Price per 1,000 API calls ($)</label>
                        <input
                            id="price-per-1k-api-calls"
                            type="number"
                            min="0"
                            step="0.0001"
                            value={form.pricePer1kApiCalls}
                            onChange={(e) => setForm({ ...form, pricePer1kApiCalls: Number(e.target.value) })}
                            className="form-input tabular-nums"
                            required
                        />
                    </div>
                    <div className="pt-4">
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? "Saving…" : "Update global pricing"}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
