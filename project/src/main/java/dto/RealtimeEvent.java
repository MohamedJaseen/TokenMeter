package dto;

import domain.UsageEvent;

import java.time.Instant;

public record RealtimeEvent(
        String type,
        String eventId,
        String tenantId,
        String metricName,
        Long units,
        Instant timestamp
) {

    public static final String TYPE_CONNECTED = "connected";
    public static final String TYPE_USAGE = "usage";

    public static RealtimeEvent connected(String tenantId) {
        return new RealtimeEvent(
                TYPE_CONNECTED,
                null,
                tenantId,
                null,
                null,
                Instant.now());
    }

    public static RealtimeEvent from(UsageEvent event) {
        return new RealtimeEvent(
                TYPE_USAGE,
                event.eventId(),
                event.tenantId(),
                event.metricName(),
                event.units(),
                event.timestamp());
    }
}