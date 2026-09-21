package dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PricingUpdateRequest(
        @NotNull(message = "pricePer1kTokens is required")
        @DecimalMin(value = "0", message = "pricePer1kTokens must be >= 0")
        BigDecimal pricePer1kTokens,

        @NotNull(message = "pricePer1kApiCalls is required")
        @DecimalMin(value = "0", message = "pricePer1kApiCalls must be >= 0")
        BigDecimal pricePer1kApiCalls
) {
}