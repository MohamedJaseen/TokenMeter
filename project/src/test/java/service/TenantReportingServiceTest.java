package service;

import dto.UsageReportResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import persistence.entity.UsageHourlyAggregate;
import persistence.repository.TenantInvoiceRepository;
import persistence.repository.TenantRepository;
import persistence.repository.UsageHourlyAggregateRepository;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TenantReportingServiceTest {

    private UsageHourlyAggregateRepository usageRepository;
    private TenantRepository tenantRepository;
    private TenantReportingService reportingService;

    @BeforeEach
    void setUp() {
        usageRepository = mock(UsageHourlyAggregateRepository.class);
        tenantRepository = mock(TenantRepository.class);
        reportingService = new TenantReportingService(
                usageRepository,
                mock(TenantInvoiceRepository.class),
                tenantRepository);

        when(tenantRepository.existsById("tenantA")).thenReturn(true);
    }

    @Test
    void usageSummaryIncludesMetricTotalsAndCombinedHourlyBuckets() {
        Instant bucket = Instant.now().truncatedTo(ChronoUnit.HOURS);
        when(usageRepository.findByTenantIdAndBucketHourBetween(
                eq("tenantA"),
                any(Instant.class),
                any(Instant.class)))
                .thenReturn(List.of(
                        aggregate("api_calls", bucket, 2),
                        aggregate("llm_tokens", bucket, 105),
                        aggregate("api_calls", bucket.minus(1, ChronoUnit.HOURS), 3)));

        var response = reportingService.getUsage("tenantA", "24h");

        assertThat(response.totalUsage()).isEqualTo(110);
        assertThat(response.apiCallsCount()).isEqualTo(5);
        assertThat(response.llmTokensCount()).isEqualTo(105);
        assertThat(response.hourlyUsage())
                .extracting(UsageReportResponse.HourlyUsage::units)
                .containsExactly(3L, 107L);
    }

    @Test
    void usageSummaryRejectsUnsupportedRange() {
        assertThatThrownBy(() -> reportingService.getUsage("tenantA", "all"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Unsupported usage range");
    }

    private UsageHourlyAggregate aggregate(
            String metricName,
            Instant bucket,
            long units) {

        UsageHourlyAggregate aggregate = new UsageHourlyAggregate();
        aggregate.setTenantId("tenantA");
        aggregate.setMetricName(metricName);
        aggregate.setBucketHour(bucket);
        aggregate.setTotalUnits(units);
        return aggregate;
    }
}
