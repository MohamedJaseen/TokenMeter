package dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.Instant;

public record UsageEventRequest(
        @NotBlank String eventId,
        @NotBlank String tenantId,
        @NotBlank String metricName,
        @NotNull @Positive Long units,
        @NotNull Instant timestamp
) {
}
