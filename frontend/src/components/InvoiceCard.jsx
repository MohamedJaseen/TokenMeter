export default function InvoiceCard({ invoices }) {

    const invoice = invoices[0];

    if (!invoice) {
        return (
            <div className="card wide">
                <h2>Invoice</h2>
                <p className="hint">No invoice found.</p>
            </div>
        );
    }

    return (
        <div className="card wide">
            <h2>Invoice</h2>
            <p>
                Period:{" "}
                {invoice.billingPeriodStart}
                {" - "}
                {invoice.billingPeriodEnd}
            </p>
            <p>
                Units:{" "}
                {invoice.totalUnitsConsumed.toLocaleString()}
            </p>
            <p>
                Amount:{" $"}
                {Number(invoice.totalAmountBilled)
                    .toLocaleString(undefined, {
                        minimumFractionDigits: 2
                    })}
            </p>
            <p>
                Status:{" "}
                {invoice.paymentStatus}
            </p>
        </div>
    );
}