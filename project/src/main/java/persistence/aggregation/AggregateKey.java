package persistence.aggregation;

import java.time.Instant;

public record AggregateKey(
        String tenantId,
        String metricName,
        Instant hourBucket
) {
}