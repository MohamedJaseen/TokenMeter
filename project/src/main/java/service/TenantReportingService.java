package service;

import dto.InvoiceReportResponse;
import dto.UsageReportResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import persistence.entity.TenantInvoice;
import persistence.entity.UsageHourlyAggregate;
import persistence.repository.TenantInvoiceRepository;
import persistence.repository.TenantRepository;
import persistence.repository.UsageHourlyAggregateRepository;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
public class TenantReportingService {

    private static final Map<String, Duration> USAGE_RANGES = Map.of(
            "24h", Duration.ofHours(24),
            "7d", Duration.ofDays(7),
            "30d", Duration.ofDays(30));

    private final UsageHourlyAggregateRepository usageRepository;
    private final TenantInvoiceRepository invoiceRepository;
    private final TenantRepository tenantRepository;

    public TenantReportingService(
            UsageHourlyAggregateRepository usageRepository,
            TenantInvoiceRepository invoiceRepository,
            TenantRepository tenantRepository) {

        this.usageRepository = usageRepository;
        this.invoiceRepository = invoiceRepository;
        this.tenantRepository = tenantRepository;
    }

    public UsageReportResponse getUsage(String tenantId, String range) {

        requireTenant(tenantId);

        Duration duration = USAGE_RANGES.get(range);
        if (duration == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported usage range: " + range);
        }

        Instant end = Instant.now();
        Instant start = end.minus(duration);
        List<UsageHourlyAggregate> rows =
                usageRepository
                        .findByTenantIdAndBucketHourBetween(
                                tenantId,
                                start,
                                end);

        long totalUsage = rows.stream()
                .mapToLong(UsageHourlyAggregate::getTotalUnits)
                .sum();

        long apiCallsCount = sumMetric(rows, "api_calls");
        long llmTokensCount = sumMetric(rows, "llm_tokens");

        Map<Instant, Long> hourlyTotals = new TreeMap<>();
        rows.forEach(row ->
                hourlyTotals.merge(
                        row.getBucketHour(),
                        row.getTotalUnits(),
                        Long::sum));

        List<UsageReportResponse.HourlyUsage> hourly =
                hourlyTotals.entrySet()
                        .stream()
                        .map(entry ->
                                new UsageReportResponse.HourlyUsage(
                                        entry.getKey(),
                                        entry.getValue()))
                        .toList();

        return new UsageReportResponse(
                tenantId,
                totalUsage,
                apiCallsCount,
                llmTokensCount,
                hourly
        );
    }

    private long sumMetric(
            List<UsageHourlyAggregate> rows,
            String metricName) {

        return rows.stream()
                .filter(row -> metricName.equalsIgnoreCase(row.getMetricName()))
                .mapToLong(UsageHourlyAggregate::getTotalUnits)
                .sum();
    }

    public List<InvoiceReportResponse> getInvoices(
            String tenantId) {

        requireTenant(tenantId);

        return invoiceRepository
                .findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(invoice ->
                        new InvoiceReportResponse(
                                invoice.getInvoiceId(),
                                invoice.getTenantId(),
                                invoice.getBillingPeriodStart(),
                                invoice.getBillingPeriodEnd(),
                                invoice.getTotalUnitsConsumed(),
                                invoice.getTotalAmountBilled(),
                                invoice.getPaymentStatus(),
                                invoice.getPaymentSubmittedAt(),
                                invoice.getCreatedAt()
                        ))
                .toList();
    }

    private void requireTenant(String tenantId) {

        if (!tenantRepository.existsById(tenantId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Tenant not found: " + tenantId);
        }
    }
}