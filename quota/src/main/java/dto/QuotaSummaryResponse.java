package dto;

import domain.QuotaStatus;

public record QuotaSummaryResponse(
        String tenantId,
        String tier,
        long monthlyLimit,
        long currentUsage,
        double usagePercentage,
        int alertThresholdPercent,
        boolean hardCapEnabled,
        QuotaStatus status
) {
}