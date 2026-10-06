package dto;

import dto.ApiKeyResponse;
import dto.InvoiceReportResponse;
import dto.QuotaSummarySnapshot;
import dto.UsageReportResponse;

import java.util.List;

public record AdminTenantDetailResponse(
        AdminTenantResponse tenant,
        UsageReportResponse usage,
        QuotaSummarySnapshot quota,
        QuotaConfigSnapshot quotaConfig,
        List<InvoiceReportResponse> invoices,
        List<ApiKeyResponse> apiKeys
) {
}
