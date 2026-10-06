package dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record AdminTenantCreateRequest(
        @NotBlank @Size(min = 2, max = 64) String tenantId,
        @NotBlank @Size(min = 2, max = 255) String tenantName,
        @Email String contactEmail,
        @NotBlank @Size(min = 3, max = 128) String adminUsername,
        @NotBlank @Size(min = 6, max = 128) String adminPassword,
        @NotBlank @Size(max = 32) String planName,
        @Positive long monthlyUnitLimit,
        boolean hardCapEnabled,
        @Min(1) @Max(100) int alertThresholdPercent,
        @DecimalMin("0.000000") BigDecimal unitRateDollars
) {
}
