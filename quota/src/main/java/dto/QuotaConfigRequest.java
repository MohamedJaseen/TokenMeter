package dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record QuotaConfigRequest(
        @NotBlank(message = "tierName must not be blank")
        String tierName,

        @Positive(message = "monthlyUnitLimit must be greater than 0")
        long monthlyUnitLimit,

        boolean hardCapEnabled,

        @Min(value = 1, message = "alertThresholdPercent must be between 1 and 100")
        @Max(value = 100, message = "alertThresholdPercent must be between 1 and 100")
        int alertThresholdPercent,

        @NotNull(message = "unitRateDollars must not be null")
        @DecimalMin(value = "0.000000", message = "unitRateDollars must not be negative")
        BigDecimal unitRateDollars
) {
}