package domain;

import java.time.Instant;

public record UsageEvent(
        String eventId,
        String tenantId,
        String metricName,
        Long units,
        Instant timestamp
) {
}