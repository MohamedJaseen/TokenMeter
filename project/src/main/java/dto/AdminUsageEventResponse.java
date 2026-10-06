package dto;

import java.time.Instant;

public record AdminUsageEventResponse(
        String eventId,
        String tenantId,
        String metricName,
        long units,
        Instant eventTimestamp,
        Instant processedAt,
        long latencyMillis,
        String processingStatus,
        boolean duplicate
) {
}
