package dto;

import java.math.BigDecimal;
import java.time.Instant;

public record PlatformPricingResponse(
        Integer id,
        BigDecimal pricePer1kTokens,
        BigDecimal pricePer1kApiCalls,
        Instant updatedAt
) {

    public static PlatformPricingResponse defaults() {
        return new PlatformPricingResponse(
                1,
                new BigDecimal("0.002000"),
                new BigDecimal("0.005000"),
                null);
    }
}