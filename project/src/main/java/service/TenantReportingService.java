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

import java.util.List;

@Service
public class TenantReportingService {

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

    public UsageReportResponse getUsage(String tenantId) {

        requireTenant(tenantId);

        List<UsageHourlyAggregate> rows =
                usageRepository
                        .findByTenantIdOrderByBucketHourAsc(tenantId);

        long totalUsage = rows.stream()
                .mapToLong(UsageHourlyAggregate::getTotalUnits)
                .sum();

        List<UsageReportResponse.HourlyUsage> hourly =
                rows.stream()
                        .map(row ->
                                new UsageReportResponse.HourlyUsage(
                                        row.getBucketHour(),
                                        row.getTotalUnits()
                                ))
                        .toList();

        return new UsageReportResponse(
                tenantId,
                totalUsage,
                hourly
        );
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