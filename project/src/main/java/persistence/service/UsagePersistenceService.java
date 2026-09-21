package persistence.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import persistence.aggregation.AggregateKey;

import java.sql.Timestamp;
import java.util.Map;

@Service
public class UsagePersistenceService {

    private final JdbcTemplate jdbcTemplate;

    public UsagePersistenceService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void persist(Map<AggregateKey, Long> rollups) {

        String sql = """
                INSERT INTO usage_hourly_aggregates
                    (
                        tenant_id,
                        metric_name,
                        bucket_hour,
                        total_units,
                        last_updated_at
                    )
                VALUES (?, ?, ?, ?, NOW())

                ON CONFLICT (
                    tenant_id,
                    metric_name,
                    bucket_hour
                )

                DO UPDATE SET
                    total_units =
                        usage_hourly_aggregates.total_units
                        + EXCLUDED.total_units,

                    last_updated_at = NOW()
                """;

        jdbcTemplate.batchUpdate(
                sql,
                rollups.entrySet(),
                100,
                (ps, entry) -> {

                    AggregateKey key = entry.getKey();

                    ps.setString(1, key.tenantId());
                    ps.setString(2, key.metricName());
                    ps.setTimestamp(
                            3,
                            Timestamp.from(key.hourBucket())
                    );
                    ps.setLong(4, entry.getValue());
                }
        );
    }
}