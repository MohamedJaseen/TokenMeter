export default function QuotaCard({ quota }) {
    return (
        <div className="card">
            <h2>Current Quota</h2>
            <p className="value">
                {quota.currentUsage.toLocaleString()}
                {" / "}
                {quota.monthlyLimit.toLocaleString()}
            </p>
            <p>{quota.usagePercentage.toFixed(1)}% used</p>
            {quota.status === "WARNING" && (
                <p className="badge warning">WARNING</p>
            )}
            {quota.status === "EXCEEDED" && (
                <p className="badge hardcap">
                    {quota.hardCapEnabled ? "HARD CAP" : "EXCEEDED"}
                </p>
            )}
        </div>
    );
}