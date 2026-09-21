package dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record QuotaUsageRequest(
        @NotBlank(message = "tenantId must not be blank")
        String tenantId,

        @NotBlank(message = "metricName must not be blank")
        String metricName,

        @Positive(message = "units must be greater than 0")
        long units
) {
}