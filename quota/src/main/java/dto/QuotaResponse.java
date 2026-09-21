package dto;

import domain.QuotaEvaluationResult;
import domain.QuotaStatus;

public record QuotaResponse(
        String tenantId,
        long currentUsage,
        long monthlyLimit,
        double usagePercentage,
        QuotaStatus status,
        boolean hardCapEnabled
) {

    public static QuotaResponse from(QuotaEvaluationResult result) {
        return new QuotaResponse(
                result.tenantId(),
                result.currentUsage(),
                result.monthlyLimit(),
                result.usagePercentage(),
                result.status(),
                result.hardCapEnabled()
        );
    }
}