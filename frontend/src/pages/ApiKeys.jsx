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
        },
    });

    const revokeMutation = useMutation({
        mutationFn: (keyId) => revokeApiKey(tenantId, keyId),
        onSuccess: () => {
            queryClient.invalidateQueries(["apiKeys", tenantId]);
        },
    });

    const handleCreate = (e) => {
        e.preventDefault();
        if (!label) return;
        createMutation.mutate(label);
    };

    if (isLoading) return <Skeleton className="h-64" />;
    if (error) return <ErrorState message="Failed to load API keys." onRetry={refetch} />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">API Keys Management</h1>
                    <p className="text-sm text-gray-500">Manage client credentials for AI proxy authentication.</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>Create New API Key</Button>
            </div>

            <Card>
                <Table
                    headers={["Prefix", "Label", "Created At", "Last Used", "Actions"]}
                    data={keys}
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
                                    Revoke
                                </Button>
                            </td>
                        </tr>
                    )}
                />
            </Card>

            <Modal isOpen={isCreateOpen} title="Create API Key" onClose={() => { setIsCreateOpen(false); setNewKeySecret(null); }}>
                {newKeySecret ? (
                    <div className="space-y-4">
                        <div className="rounded-md bg-amber-50 p-4 border border-amber-200 text-amber-800 text-sm">
                            <strong>Save this secret now!</strong> It will never be shown again.
                        </div>
                        <div className="rounded bg-gray-100 p-3 font-mono text-xs text-gray-900 break-all">
                            {newKeySecret}
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={() => { setIsCreateOpen(false); setNewKeySecret(null); }}>Done</Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Key Label</label>
                            <input
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
                            <Button type="submit" disabled={createMutation.isPending}>Generate</Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
