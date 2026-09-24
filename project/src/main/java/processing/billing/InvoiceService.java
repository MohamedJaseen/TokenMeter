package processing.billing;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import persistence.entity.TenantInvoice;
import persistence.entity.UsageHourlyAggregate;
import persistence.repository.TenantInvoiceRepository;
import persistence.repository.UsageHourlyAggregateRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;

@Service
public class InvoiceService {

    private static final Logger log =
            LoggerFactory.getLogger(InvoiceService.class);

    private final BillingService billingService;
    private final UsageHourlyAggregateRepository usageRepository;
    private final TenantInvoiceRepository invoiceRepository;

    public InvoiceService(
            BillingService billingService,
            UsageHourlyAggregateRepository usageRepository,
            TenantInvoiceRepository invoiceRepository) {

        this.billingService = billingService;
        this.usageRepository = usageRepository;
        this.invoiceRepository = invoiceRepository;
    }

    public TenantInvoice generateInvoice(
            String tenantId,
            LocalDate periodStart,
            LocalDate periodEnd) {

        if (periodEnd.isBefore(periodStart)) {
            throw new IllegalArgumentException(
                    "periodEnd must not be before periodStart");
        }

        // Idempotency: a retried request for the same period returns the
        // original invoice instead of creating a duplicate. The unique index
        // (tenant_id, billing_period_start, billing_period_end) enforces this
        // under concurrent generation.
        Optional<TenantInvoice> existing =
                invoiceRepository
                        .findByTenantIdAndBillingPeriodStartAndBillingPeriodEnd(
                                tenantId,
                                periodStart,
                                periodEnd);

        if (existing.isPresent()) {
            log.info(
                    "Invoice already exists for tenant {} period {}-{}: {}",
                    tenantId,
                    periodStart,
                    periodEnd,
                    existing.get().getInvoiceId());
            return existing.get();
        }

        Instant start =
                periodStart.atStartOfDay()
                        .toInstant(ZoneOffset.UTC);

        Instant end =
                periodEnd.plusDays(1)
                        .atStartOfDay()
                        .toInstant(ZoneOffset.UTC);

        BigDecimal totalAmount =
                billingService.calculateBilling(
                        tenantId,
                        start,
                        end
                ).setScale(2, RoundingMode.HALF_UP);

        long totalUnits =
                usageRepository
                        .findByTenantIdAndBucketHourBetween(
                                tenantId,
                                start,
                                end
                        )
                        .stream()
                        .mapToLong(UsageHourlyAggregate::getTotalUnits)
                        .sum();

        TenantInvoice invoice = new TenantInvoice();

        invoice.setTenantId(tenantId);
        invoice.setBillingPeriodStart(periodStart);
        invoice.setBillingPeriodEnd(periodEnd);
        invoice.setTotalUnitsConsumed(totalUnits);
        invoice.setTotalAmountBilled(totalAmount);
        invoice.setPaymentStatus("PENDING");
        invoice.setCreatedAt(Instant.now());

        try {
            TenantInvoice saved =
                    invoiceRepository.saveAndFlush(invoice);

            log.info(
                    "Generated invoice {} for tenant {} period {}-{} | units={} amount={}",
                    saved.getInvoiceId(),
                    tenantId,
                    periodStart,
                    periodEnd,
                    totalUnits,
                    totalAmount);

            return saved;

        } catch (DataIntegrityViolationException e) {

            // Concurrent generation for the same period raced; the unique
            // index guarantees exactly one invoice. Return the winner.
            return invoiceRepository
                    .findByTenantIdAndBillingPeriodStartAndBillingPeriodEnd(
                            tenantId,
                            periodStart,
                            periodEnd)
                    .orElseThrow(() -> new IllegalStateException(
                            "Invoice generation failed for tenant " + tenantId,
                            e));
        }
    }
}