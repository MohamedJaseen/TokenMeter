package dto;

public record AdminTenantResponse(
        String tenantId,
        String tenantName,
        String contactEmail,
        String tenantStatus,
        String tierName,
        long monthlyLimit,
        long currentUsage,
        double usagePercentage,
        int alertThresholdPercent,
        boolean hardCapEnabled,
        String quotaStatus
) {

    public static AdminTenantResponse from(
            persistence.entity.Tenant tenant,
            QuotaSummarySnapshot snapshot) {

        return new AdminTenantResponse(
                tenant.getTenantId(),
                tenant.getTenantName(),
                tenant.getContactEmail(),
                tenant.getStatus(),
                snapshot.tier(),
                snapshot.monthlyLimit(),
                snapshot.currentUsage(),
                snapshot.usagePercentage(),
                snapshot.alertThresholdPercent(),
                snapshot.hardCapEnabled(),
                snapshot.status());
    }
}