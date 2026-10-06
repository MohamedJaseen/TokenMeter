package dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.DecimalMin;

import java.math.BigDecimal;

public record AdminQuotaUpdateRequest(
        @NotBlank String tierName,
        @Positive long monthlyUnitLimit,
        boolean hardCapEnabled,
        @Min(1) @Max(100) int alertThresholdPercent,
        @NotNull @DecimalMin("0.000000") BigDecimal unitRateDollars
) {
}
