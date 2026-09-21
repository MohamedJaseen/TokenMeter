export default function HourlyUsage({ hours }) {

    const max = Math.max(1, ...hours.map(h => h.units));

    return (
        <div className="card wide">
            <h2>Hourly Usage</h2>

            {hours.length === 0 ? (
                <p className="hint">No usage buckets yet.</p>
            ) : (
                <div className="bars">
                    {hours.map(h => (
                        <div key={h.bucketHour} className="bar-col">
                            <div
                                className="bar"
                                style={{
                                    height: `${(h.units / max) * 100}%`
                                }}
                            />
                            <span className="bar-label">
                                {h.units.toLocaleString()}
                            </span>
                            <span className="bar-time">
                                {new Date(h.bucketHour).toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}