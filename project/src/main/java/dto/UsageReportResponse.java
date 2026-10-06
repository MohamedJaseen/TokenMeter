package dto;

import java.time.Instant;
import java.util.List;

public record UsageReportResponse(
        String tenantId,
        long totalUsage,
        long apiCallsCount,
        long llmTokensCount,
        List<HourlyUsage> hourlyUsage
) {

    public record HourlyUsage(
            Instant bucketHour,
            long units
    ) {
    }
}