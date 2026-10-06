import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/useAuth";
import { fetchInvoices, fetchManualPaymentDetails, submitManualPayment } from "../api/endpoints/billing";
import { Card } from "../components/ui/Card";
import { Table } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { ErrorState } from "../components/ui/ErrorState";
import { formatMoney, formatDate } from "../lib/format";

export default function Billing() {
    const { user } = useAuth();
    const tenantId = user?.tenantId || "tenantA";
    const queryClient = useQueryClient();
    const [paymentDetails, setPaymentDetails] = useState(null);
    const [paymentMessage, setPaymentMessage] = useState("");
    const [paymentError, setPaymentError] = useState("");

    const { data: invoices, isLoading, error, refetch } = useQuery({
        queryKey: ["invoices", tenantId],
        queryFn: () => fetchInvoices(tenantId),
    });

    const paymentDetailsMutation = useMutation({
        mutationFn: (invoiceId) => fetchManualPaymentDetails(tenantId, invoiceId),
        onSuccess: (details) => {
            setPaymentDetails(details);
            setPaymentError("");
            setPaymentMessage("");
        },
        onError: (error) => {
            setPaymentError(
                error?.response?.data?.message
                || error.message
                || "Unable to load payment details. Please try again.",
            );
        },
    });

    const submissionMutation = useMutation({
        mutationFn: (invoiceId) => submitManualPayment(tenantId, invoiceId),
        onSuccess: async (invoice) => {
            setPaymentDetails(null);
            setPaymentError("");
            setPaymentMessage(`Payment reported for invoice ${invoice.invoiceId}. A Super Admin must verify the transfer before it is marked paid.`);
            await queryClient.invalidateQueries({ queryKey: ["invoices", tenantId] });
        },
        onError: (error) => setPaymentError(
            error?.response?.data?.message
            || error.message
            || "Could not report this payment. Please try again.",
        ),
    });

    if (isLoading) return <Skeleton className="h-64" />;
    if (error) return <ErrorState message="Failed to load invoice history." onRetry={refetch} />;

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.13em] text-[#9aabc0]">Workspace billing</p>
                    <h1 className="text-2xl font-semibold tracking-tight text-[#edf2f8]">Billing & invoices</h1>
                    <p className="mt-2 text-sm text-[#91a0b2]">Scan your configured Google Pay QR, then submit the transfer for manual verification.</p>
                </div>
                <Badge variant="info">{invoices?.length || 0} invoice{invoices?.length === 1 ? "" : "s"}</Badge>
            </div>

            {paymentMessage && <p role="status" aria-live="polite" className="rounded-lg border border-[#31564d] bg-[#132a28] px-4 py-3 text-sm text-[#a4e2c8]">{paymentMessage}</p>}
            {paymentError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#713f3a] bg-[#301f27] px-4 py-3 text-sm text-[#f0a18d]"><span>{paymentError}</span><button type="button" onClick={() => { setPaymentError(""); paymentDetailsMutation.reset(); submissionMutation.reset(); }} className="rounded-md border border-[#825148] px-3 py-1.5 text-xs font-semibold hover:bg-[#45272e]">Dismiss</button></div>}

            {paymentDetails && (
                <Card className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
                    <img
                        src={paymentDetails.qrImageUrl}
                        alt="Configured Google Pay payment QR code"
                        className="h-52 w-52 rounded-xl border border-[#2b3b4e] bg-white object-contain p-2"
                    />
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-semibold text-[#edf2f8]">Pay {formatMoney(Math.round(Number(paymentDetails.amount) * 100), paymentDetails.currency)}</h2>
                        <p className="mt-2 text-sm text-[#91a0b2]">Scan this QR with Google Pay or another supported UPI app. The invoice will remain unpaid until an administrator verifies your payment.</p>
                        <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                            <button
                                type="button"
                                onClick={() => submissionMutation.mutate(paymentDetails.invoiceId)}
                                disabled={submissionMutation.isPending}
                                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#d6b65e] px-4 py-2 text-xs font-semibold text-[#171a20] transition hover:bg-[#e7c86d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e7c86d] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {submissionMutation.isPending ? "Submitting…" : "I’ve completed payment"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentDetails(null)}
                                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#304155] px-4 py-2 text-xs font-semibold text-[#c4cedc] hover:bg-[#1a2735]"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </Card>
            )}

            <Card>
                <Table
                    headers={["Invoice ID", "Billing period", "Total units", "Total amount", "Status", "Issued at", "Payment"]}
                    data={invoices}
                    label="Invoice history"
                    renderRow={(inv) => (
                        <tr key={inv.invoiceId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-900">{inv.invoiceId}</td>
                            <td className="px-6 py-4 text-gray-700">
                                <span className="whitespace-nowrap">{inv.billingPeriodStart} <span className="px-1 text-[#64748b]">→</span> {inv.billingPeriodEnd}</span>
                            </td>
                            <td className="px-6 py-4 tabular-nums text-gray-900">{inv.totalUnitsConsumed}</td>
                            <td className="px-6 py-4 font-semibold text-gray-900 tabular-nums">
                                {formatMoney(Math.round(Number(inv.totalAmountBilled || 0) * 100), "INR")}
                            </td>
                            <td className="px-6 py-4">
                                <Badge variant={inv.paymentStatus === "PAID" ? "success" : inv.paymentStatus === "FAILED" ? "danger" : "warning"}>
                                    {inv.paymentStatus === "PAYMENT_SUBMITTED" ? "AWAITING VERIFICATION" : inv.paymentStatus || "PENDING"}
                                </Badge>
                            </td>
                            <td className="px-6 py-4 text-gray-500">{formatDate(inv.createdAt)}</td>
                            <td className="px-6 py-4">
                                {["PENDING", "FAILED"].includes(inv.paymentStatus) && Number(inv.totalAmountBilled) > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => { setPaymentError(""); setPaymentMessage(""); paymentDetailsMutation.mutate(inv.invoiceId); }}
                                        disabled={paymentDetailsMutation.isPending}
                                        aria-label={`Pay ${formatMoney(Math.round(Number(inv.totalAmountBilled || 0) * 100), "INR")} for invoice ${inv.invoiceId}`}
                                        className="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-lg bg-[#d6b65e] px-3 py-2 text-xs font-semibold text-[#171a20] transition hover:bg-[#e7c86d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e7c86d] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {paymentDetailsMutation.isPending && paymentDetailsMutation.variables === inv.invoiceId ? "Loading QR…" : `Pay ${formatMoney(Math.round(Number(inv.totalAmountBilled || 0) * 100), "INR")}`}
                                    </button>
                                ) : inv.paymentStatus === "PAYMENT_SUBMITTED" ? (
                                    <span className="text-xs font-medium text-amber-700">Awaiting verification</span>
                                ) : inv.paymentStatus === "PAID" ? (
                                    <span className="text-xs text-[#718197]">Paid</span>
                                ) : Number(inv.totalAmountBilled) <= 0 ? (
                                    <span className="text-xs text-[#718197]">No payment due</span>
                                ) : (
                                    <span className="text-xs text-[#718197]">—</span>
                                )}
                            </td>
                        </tr>
                    )}
                />
            </Card>
        </div>
    );
}
