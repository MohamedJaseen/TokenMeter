import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/useAuth";
import { fetchApiKeys, createApiKey, revokeApiKey } from "../api/endpoints/apiKeys";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Table } from "../components/ui/Table";
import { Modal } from "../components/ui/Modal";
import { Skeleton } from "../components/ui/Skeleton";
import { ErrorState } from "../components/ui/ErrorState";
import { formatDate } from "../lib/format";

export default function ApiKeys() {
    const { user } = useAuth();
    const tenantId = user?.tenantId || "tenantA";
    const queryClient = useQueryClient();

    const [label, setLabel] = useState("");
    const [newKeySecret, setNewKeySecret] = useState(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const { data: keys, isLoading, error, refetch } = useQuery({
        queryKey: ["apiKeys", tenantId],
        queryFn: () => fetchApiKeys(tenantId),
    });

    const createMutation = useMutation({
        mutationFn: (lbl) => createApiKey(tenantId, lbl),
        onSuccess: (data) => {
            queryClient.invalidateQueries(["apiKeys", tenantId]);
            setNewKeySecret(data.secret || data.apiKey);
            setLabel("");
            setFeedback("API key created. Copy the secret now; it will not be shown again.");
            setErrorMessage("");
        },
        onError: (error) => setErrorMessage(error?.response?.data?.message || error.message || "Could not create API key."),
    });

    const revokeMutation = useMutation({
        mutationFn: (keyId) => revokeApiKey(tenantId, keyId),
        onSuccess: () => {
            queryClient.invalidateQueries(["apiKeys", tenantId]);
            setFeedback("API key revoked.");
            setErrorMessage("");
        },
        onError: (error) => setErrorMessage(error?.response?.data?.message || error.message || "Could not revoke API key."),
    });

    const handleCreate = (e) => {
        e.preventDefault();
        if (!label) return;
        createMutation.mutate(label);
    };

    if (isLoading) return <Skeleton className="h-64" />;
    if (error) return <ErrorState message="Failed to load API keys." onRetry={refetch} />;

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.13em] text-[#9aabc0]">Developer settings</p>
                <h1 className="text-2xl font-semibold tracking-tight text-[#edf2f8]">API keys</h1>
                <p className="mt-2 text-sm text-[#91a0b2]">Manage credentials used by your applications to call the AI proxy.</p>
            </div>
            <Button onClick={() => { setErrorMessage(""); setIsCreateOpen(true); }}>Create API key</Button>
        </div>

        {feedback && <p role="status" className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-xs text-emerald-200">{feedback}</p>}
        {errorMessage && <p role="alert" className="rounded-lg border border-rose-400/25 bg-rose-400/5 px-4 py-3 text-xs text-rose-200">{errorMessage}</p>}

        <Card>
                <Table
                    headers={["Prefix", "Label", "Created At", "Last Used", "Actions"]}
                    data={keys}
                label="API keys"
                    renderRow={(k) => (
                        <tr key={k.id || k.keyId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-mono text-xs text-gray-900">{k.prefix || "sec_...xxx"}</td>
                            <td className="px-6 py-4 font-medium text-gray-900">{k.label || "Default Key"}</td>
                            <td className="px-6 py-4 text-gray-500">{formatDate(k.createdAt)}</td>
                            <td className="px-6 py-4 text-gray-500">{formatDate(k.lastUsedAt) || "Never"}</td>
                            <td className="px-6 py-4">
                                <Button
                                    variant="danger"
                                    className="px-3 py-1 text-xs"
                                    onClick={() => revokeMutation.mutate(k.id || k.keyId)}
                                    disabled={revokeMutation.isPending}
                                >
                                    {revokeMutation.isPending ? "Revoking…" : "Revoke"}
                                </Button>
                            </td>
                        </tr>
                    )}
                />
            </Card>

            <Modal isOpen={isCreateOpen} title="Create API key" onClose={() => { setIsCreateOpen(false); setNewKeySecret(null); }}>
                {newKeySecret ? (
                    <div className="space-y-4">
                        <div role="status" className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">
                            <strong>Save this secret now!</strong> It will never be shown again.
                        </div>
                        <div className="rounded-lg border border-[#35465b] bg-[#0d1520] p-3 font-mono text-xs text-gray-900 break-all">
                            {newKeySecret}
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={() => { setIsCreateOpen(false); setNewKeySecret(null); }}>Done</Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label htmlFor="api-key-label" className="block text-sm font-medium text-gray-700">Key label</label>
                            <input
                                id="api-key-label"
                                type="text"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="e.g., Production Backend"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                                required
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Generating…" : "Generate"}</Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
