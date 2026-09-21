package dto;

import java.math.BigDecimal;
import java.time.Instant;

public record QuotaSummarySnapshot(
        String tenantId,
        String tier,
        long monthlyLimit,
        long currentUsage,
        double usagePercentage,
        int alertThresholdPercent,
        boolean hardCapEnabled,
        String status
) {
}