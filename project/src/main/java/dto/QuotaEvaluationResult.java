package dto;

public record QuotaEvaluationResult(
        String tenantId,
        long currentUsage,
        long monthlyLimit,
        double usagePercentage,
        String status,
        boolean hardCapEnabled
) {
}