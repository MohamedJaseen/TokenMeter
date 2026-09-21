package processing.service;

import dto.QuotaConfigSnapshot;
import dto.QuotaEvaluationResult;
import dto.QuotaSummarySnapshot;
import dto.QuotaUsageRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;

@Component
public class QuotaClient {

    private final RestClient restClient;

    public QuotaClient(
            @Value("${quota.service.url:http://localhost:8082}") String baseUrl,
            @Value("${app.quota.internal-token:}") String internalToken) {

        RestClient.Builder builder =
                RestClient.builder().baseUrl(baseUrl);

        if (StringUtils.hasText(internalToken)) {
            builder.defaultHeader(
                    "X-Internal-Token",
                    internalToken);
        }

        this.restClient = builder.build();
    }

    public QuotaEvaluationResult evaluate(
            String tenantId,
            String metricName,
            long units) {

        return restClient.post()
                .uri("/api/v1/quota/evaluate")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new QuotaUsageRequest(tenantId, metricName, units))
                .retrieve()
                .body(QuotaEvaluationResult.class);
    }

    public BigDecimal getUnitRateDollars(String tenantId) {

        QuotaConfigSnapshot config =
                restClient.get()
                        .uri("/api/v1/tenants/{id}/quota/config", tenantId)
                        .retrieve()
                        .body(QuotaConfigSnapshot.class);

        if (config == null) {
            throw new IllegalStateException(
                    "Quota service returned no configuration for tenant: "
                            + tenantId);
        }

        return config.unitRateDollars();
    }

    public QuotaSummarySnapshot getUsageSummary(String tenantId) {

        QuotaSummarySnapshot snapshot =
                restClient.get()
                        .uri("/api/v1/tenants/{id}/quota", tenantId)
                        .retrieve()
                        .body(QuotaSummarySnapshot.class);

        if (snapshot == null) {
            throw new IllegalStateException(
                    "Quota service returned no summary for tenant: "
                            + tenantId);
        }

        return snapshot;
    }
}