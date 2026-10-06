package persistence.repository;

import dto.AdminUsageEventResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

@Repository
public class AdminUsageEventRepository {

    private final JdbcTemplate jdbcTemplate;

    public AdminUsageEventRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void recordProcessed(
            String eventId,
            String tenantId,
            String metricName,
            long units,
            Instant eventTimestamp,
            Instant processedAt) {

        jdbcTemplate.update("""
                INSERT INTO usage_event_ledger
                    (event_id, tenant_id, metric_name, units,
                     event_timestamp, processed_at, processing_status, duplicate)
                VALUES (?, ?, ?, ?, ?, ?, 'PROCESSED', FALSE)
                ON CONFLICT (tenant_id, event_id) DO NOTHING
                """,
                eventId,
                tenantId,
                metricName,
                units,
                Timestamp.from(eventTimestamp),
                Timestamp.from(processedAt));
    }

    public List<AdminUsageEventResponse> search(
            String tenantId,
            String metricName,
            Instant from,
            Instant to,
            int limit) {

        StringBuilder sql = new StringBuilder("""
                SELECT event_id, tenant_id, metric_name, units,
                       event_timestamp, processed_at, processing_status, duplicate
                FROM usage_event_ledger
                WHERE 1 = 1
                """);
        java.util.List<Object> parameters = new java.util.ArrayList<>();

        if (tenantId != null && !tenantId.isBlank()) {
            sql.append(" AND tenant_id = ?");
            parameters.add(tenantId);
        }
        if (metricName != null && !metricName.isBlank()) {
            sql.append(" AND metric_name = ?");
            parameters.add(metricName);
        }
        if (from != null) {
            sql.append(" AND event_timestamp >= ?");
            parameters.add(Timestamp.from(from));
        }
        if (to != null) {
            sql.append(" AND event_timestamp <= ?");
            parameters.add(Timestamp.from(to));
        }

        sql.append(" ORDER BY event_timestamp DESC LIMIT ?");
        parameters.add(limit);

        return jdbcTemplate.query(
                sql.toString(),
                (rs, rowNum) -> {
                    Instant eventTimestamp = rs.getTimestamp("event_timestamp").toInstant();
                    Instant processedAt = rs.getTimestamp("processed_at").toInstant();
                    return new AdminUsageEventResponse(
                            rs.getString("event_id"),
                            rs.getString("tenant_id"),
                            rs.getString("metric_name"),
                            rs.getLong("units"),
                            eventTimestamp,
                            processedAt,
                            Math.max(0, processedAt.toEpochMilli() - eventTimestamp.toEpochMilli()),
                            rs.getString("processing_status"),
                            rs.getBoolean("duplicate"));
                },
                parameters.toArray());
    }
}
