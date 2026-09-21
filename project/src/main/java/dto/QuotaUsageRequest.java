package dto;

public record QuotaUsageRequest(
        String tenantId,
        String metricName,
        long units
) {
}