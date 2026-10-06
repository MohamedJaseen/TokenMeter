package persistence.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import persistence.aggregation.AggregateKey;
import domain.UsageEvent;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class UsagePersistenceService {

    private final JdbcTemplate jdbcTemplate;

    public UsagePersistenceService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @org.springframework.transaction.annotation.Transactional
    public void persist(
            Map<AggregateKey, Long> rollups,
            List<UsageEvent> events) {

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

        Instant processedAt = Instant.now();
        String eventSql = """
                INSERT INTO usage_event_ledger
                    (event_id, tenant_id, metric_name, units,
                     event_timestamp, processed_at, processing_status, duplicate)
                VALUES (?, ?, ?, ?, ?, ?, 'PROCESSED', FALSE)
                ON CONFLICT (tenant_id, event_id) DO NOTHING
                """;
        jdbcTemplate.batchUpdate(
                eventSql,
                events,
                100,
                (ps, event) -> {
                    ps.setString(1, event.eventId());
                    ps.setString(2, event.tenantId());
                    ps.setString(3, event.metricName());
                    ps.setLong(4, event.units());
                    ps.setTimestamp(5, Timestamp.from(event.timestamp()));
                    ps.setTimestamp(6, Timestamp.from(processedAt));
                });
    }
}