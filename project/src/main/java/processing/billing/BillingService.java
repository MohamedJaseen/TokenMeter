package processing.billing;

import org.springframework.stereotype.Service;
import persistence.entity.UsageHourlyAggregate;
import persistence.repository.UsageHourlyAggregateRepository;
import processing.service.QuotaClient;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Service
public class BillingService {

    private final UsageHourlyAggregateRepository usageRepository;
    private final PricingService pricingService;
    private final QuotaClient quotaClient;

    public BillingService(
            UsageHourlyAggregateRepository usageRepository,
            PricingService pricingService,
            QuotaClient quotaClient) {

        this.usageRepository = usageRepository;
        this.pricingService = pricingService;
        this.quotaClient = quotaClient;
    }

    public BigDecimal calculateBilling(
            String tenantId,
            Instant periodStart,
            Instant periodEnd) {

        List<UsageHourlyAggregate> usage =
                usageRepository
                        .findByTenantIdAndBucketHourBetween(
                                tenantId,
                                periodStart,
                                periodEnd
                        );

        BigDecimal total = BigDecimal.ZERO;

        for (UsageHourlyAggregate aggregate : usage) {

            BigDecimal unitRate =
                    getUnitRate(tenantId);

            BigDecimal cost =
                    pricingService.calculateCost(
                            aggregate.getTotalUnits(),
                            unitRate
                    );

            total = total.add(cost);
        }

        return total;
    }

    private BigDecimal getUnitRate(
            String tenantId) {

        return quotaClient.getUnitRateDollars(tenantId);
    }
}