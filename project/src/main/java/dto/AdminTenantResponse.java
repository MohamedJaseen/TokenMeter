package dto;

public record AdminTenantResponse(
        String tenantId,
        String tierName,
        long monthlyLimit,
        long currentUsage,
        double usagePercentage,
        int alertThresholdPercent,
        boolean hardCapEnabled,
        String status
) {

    public static AdminTenantResponse from(QuotaSummarySnapshot snapshot) {
        return new AdminTenantResponse(
                snapshot.tenantId(),
                snapshot.tier(),
                snapshot.monthlyLimit(),
                snapshot.currentUsage(),
                snapshot.usagePercentage(),
                snapshot.alertThresholdPercent(),
                snapshot.hardCapEnabled(),
                snapshot.status());
    }
}