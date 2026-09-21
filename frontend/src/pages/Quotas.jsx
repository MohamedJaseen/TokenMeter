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
            queryClient.invalidateQueries(["quota", tenantId]);
            queryClient.invalidateQueries(["quotaConfig", tenantId]);
            setSuccessMsg("Quota configuration updated successfully.");
            setTimeout(() => setSuccessMsg(""), 4000);
        },
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
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Quotas & Limits Management</h1>
                <p className="text-sm text-gray-500">Configure monthly consumption limits and enforcement hard caps.</p>
            </div>

            {successMsg && <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">{successMsg}</div>}

            <Card>
                <form onSubmit={handleSaveSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tier Name</label>
                        <input
                            type="text"
                            value={form.tierName}
                            onChange={(e) => setForm({ ...form, tierName: e.target.value })}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Monthly Unit Limit</label>
                        <input
                            type="number"
                            value={form.monthlyUnitLimit}
                            onChange={(e) => setForm({ ...form, monthlyUnitLimit: Number(e.target.value) })}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none tabular-nums"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Alert Threshold Percent (%)</label>
                        <input
                            type="number"
                            value={form.alertThresholdPercent}
                            onChange={(e) => setForm({ ...form, alertThresholdPercent: Number(e.target.value) })}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none tabular-nums"
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
                            {mutation.isPending ? "Saving..." : "Save Changes"}
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
