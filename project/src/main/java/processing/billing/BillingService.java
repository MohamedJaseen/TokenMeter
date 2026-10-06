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
        BigDecimal tenantUnitRate =
                quotaClient.getUnitRateDollars(tenantId);

        for (UsageHourlyAggregate aggregate : usage) {
            BigDecimal cost =
                    pricingService.calculateCost(
                            aggregate.getTotalUnits(),
                            aggregate.getMetricName(),
                            tenantUnitRate
                    );

            total = total.add(cost);
        }

        return total;
    }
}