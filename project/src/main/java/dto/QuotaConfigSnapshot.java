package dto;

import java.math.BigDecimal;

public record QuotaConfigSnapshot(
        String tenantId,
        String tierName,
        long monthlyUnitLimit,
        boolean hardCapEnabled,
        int alertThresholdPercent,
        BigDecimal unitRateDollars
) {
}