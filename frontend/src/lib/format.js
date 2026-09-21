export function formatMoney(amountInMinorUnits, currencyCode = "USD") {
    const amount = (amountInMinorUnits || 0) / 100;
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: 2,
    }).format(amount);
}

export function formatNumber(num) {
    return new Intl.NumberFormat("en-US").format(num || 0);
}

export function formatBytes(bytes) {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatDate(dateString) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    });
}
