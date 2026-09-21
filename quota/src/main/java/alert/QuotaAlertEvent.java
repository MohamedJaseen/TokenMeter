package alert;

import domain.QuotaStatus;

public record QuotaAlertEvent(
        String tenantId,
        String month,
        QuotaStatus status,
        long currentUsage,
        long monthlyLimit,
        double usagePercentage
) {
}