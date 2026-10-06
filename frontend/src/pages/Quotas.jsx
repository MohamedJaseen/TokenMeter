import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/useAuth";
import { fetchQuotaConfig, updateQuotaConfig } from "../api/endpoints/quota";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Skeleton } from "../components/ui/Skeleton";
import { ErrorState } from "../components/ui/ErrorState";

export default function Quotas() {
    const { user } = useAuth();
    const tenantId = user?.tenantId || "tenantA";
    const queryClient = useQueryClient();

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [pendingValues, setPendingValues] = useState(null);
    const [successMsg, setSuccessMsg] = useState("");
    const [mutationError, setMutationError] = useState("");

    const { data: config, isLoading, error, refetch } = useQuery({
        queryKey: ["quotaConfig", tenantId],
        queryFn: () => fetchQuotaConfig(tenantId),
    });

    const [form, setForm] = useState({
        tierName: "",
        monthlyUnitLimit: 0,
        hardCapEnabled: false,
        alertThresholdPercent: 80,
        unitRateDollars: 0,
    });

    // Sync form when config loads
    React.useEffect(() => {
        if (config) {
            setForm({
                tierName: config.tierName || "Enterprise",
                monthlyUnitLimit: config.monthlyUnitLimit || 100000,
                hardCapEnabled: !!config.hardCapEnabled,
                alertThresholdPercent: config.alertThresholdPercent || 80,
                unitRateDollars: config.unitRateDollars || 0.01,
            });
        }
    }, [config]);

    const mutation = useMutation({
        mutationFn: (newConfig) => updateQuotaConfig(tenantId, newConfig),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quota", tenantId] });
            queryClient.invalidateQueries({ queryKey: ["quotaConfig", tenantId] });
            setSuccessMsg("Quota configuration updated successfully.");
            setMutationError("");
            setTimeout(() => setSuccessMsg(""), 4000);
        },
        onError: (error) => setMutationError(error?.response?.data?.message || error.message || "Could not update quota configuration."),
    });

    const handleSaveSubmit = (e) => {
        e.preventDefault();
        // If enabling hard cap for the first time or modifying destructive settings, show modal
        if (form.hardCapEnabled && !config?.hardCapEnabled) {
            setPendingValues(form);
            setIsConfirmOpen(true);
        } else {
            mutation.mutate(form);
        }
    };

    const confirmHardCap = () => {
        setIsConfirmOpen(false);
        if (pendingValues) {
            mutation.mutate(pendingValues);
        }
    };

    if (isLoading) return <Skeleton className="h-64" />;
    if (error) return <ErrorState message="Failed to load quota configuration." onRetry={refetch} />;

    return (
        <div className="max-w-3xl space-y-6 sm:space-y-8">
            <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.13em] text-[#9aabc0]">Workspace controls</p>
                <h1 className="text-2xl font-semibold tracking-tight text-[#edf2f8]">Quota & limits</h1>
                <p className="mt-2 text-sm leading-6 text-[#91a0b2]">Review your plan allowance and configure warning and hard-cap behavior.</p>
            </div>

            {successMsg && <div role="status" className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-200">{successMsg}</div>}
            {mutationError && <div role="alert" className="rounded-lg border border-rose-400/25 bg-rose-400/5 p-4 text-sm text-rose-200">{mutationError}</div>}

            <Card>
                <form onSubmit={handleSaveSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="quota-tier-name" className="block text-sm font-medium text-gray-700">Plan name</label>
                        <input
                            id="quota-tier-name"
                            type="text"
                            value={form.tierName}
                            onChange={(e) => setForm({ ...form, tierName: e.target.value })}
                            className="form-input"
                        />
                    </div>
                    <div>
                        <label htmlFor="quota-monthly-limit" className="block text-sm font-medium text-gray-700">Monthly unit limit</label>
                        <input
                            id="quota-monthly-limit"
                            type="number"
                            min="1"
                            value={form.monthlyUnitLimit}
                            onChange={(e) => setForm({ ...form, monthlyUnitLimit: Number(e.target.value) })}
                            className="form-input tabular-nums"
                        />
                    </div>
                    <div>
                        <label htmlFor="quota-alert-threshold" className="block text-sm font-medium text-gray-700">Alert threshold (%)</label>
                        <input
                            id="quota-alert-threshold"
                            type="number"
                            min="1"
                            max="100"
                            value={form.alertThresholdPercent}
                            onChange={(e) => setForm({ ...form, alertThresholdPercent: Number(e.target.value) })}
                            className="form-input tabular-nums"
                        />
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                        <input
                            type="checkbox"
                            id="hardCap"
                            checked={form.hardCapEnabled}
                            onChange={(e) => setForm({ ...form, hardCapEnabled: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="hardCap" className="text-sm font-medium text-gray-700">
                            Enable Hard Cap (Block requests when quota is exceeded)
                        </label>
                    </div>

                    <div className="pt-4">
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? "Saving…" : "Save changes"}
                        </Button>
                    </div>
                </form>
            </Card>

            <Modal isOpen={isConfirmOpen} title="Confirm Hard Cap Enforcement" onClose={() => setIsConfirmOpen(false)}>
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Enabling a hard cap means incoming metering requests will be blocked once the monthly limit is reached. Are you sure you want to proceed?
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmHardCap}>Confirm & Enable</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
