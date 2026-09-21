package dto;

import java.time.Instant;
import java.util.UUID;

/*
 * Shape expected by the demo ingestion endpoint
 * (dto.UsageEventRequest in the demo module).
 */
public record UsageEventDto(
        UUID eventId,
        String tenantId,
        String metricName,
        long units,
        Instant timestamp
) {
}