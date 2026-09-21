package controller;

import domain.TenantQuotaConfig;
import dto.QuotaConfigRequest;
import dto.QuotaResponse;
import dto.QuotaSummaryResponse;
import dto.QuotaUsageRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import service.QuotaService;

@RestController
@RequestMapping("/api/v1")
public class QuotaController {

    private final QuotaService quotaService;

    public QuotaController(QuotaService quotaService) {
        this.quotaService = quotaService;
    }

    @PostMapping("/quota/evaluate")
    public QuotaResponse evaluate(
            @Valid @RequestBody QuotaUsageRequest request) {

        return QuotaResponse.from(
                quotaService.evaluate(
                        request.tenantId(),
                        request.metricName(),
                        request.units()));
    }

    @GetMapping("/tenants/{tenantId}/quota")
    public QuotaSummaryResponse getQuota(
            @PathVariable String tenantId) {

        return quotaService.getUsageSummary(tenantId);
    }

    @GetMapping("/tenants/{tenantId}/quota/config")
    public TenantQuotaConfig getConfig(
            @PathVariable String tenantId) {

        return quotaService.getConfig(tenantId);
    }

    @PutMapping("/tenants/{tenantId}/quota/config")
    public TenantQuotaConfig updateConfig(
            @PathVariable String tenantId,
            @Valid @RequestBody QuotaConfigRequest request) {

        return quotaService.updateConfig(tenantId, request);
    }
}