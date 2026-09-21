package domain;

public record QuotaEvaluationResult(
        String tenantId,
        long currentUsage,
        long monthlyLimit,
        double usagePercentage,
        QuotaStatus status,
        boolean hardCapEnabled
) {
}