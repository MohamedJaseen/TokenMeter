export default function UsageCard({ usage }) {
    return (
        <div className="card">
            <h2>Total Usage</h2>
            <p className="value">{usage.totalUsage.toLocaleString()}</p>
            <p className="hint">units this month</p>
        </div>
    );
}