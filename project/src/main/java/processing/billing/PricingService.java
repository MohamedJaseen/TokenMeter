package processing.billing;

import org.springframework.stereotype.Service;
import persistence.entity.PlatformPricing;
import persistence.repository.PlatformPricingRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;

@Service
public class PricingService {

    private final PlatformPricingRepository pricingRepository;

    public PricingService(PlatformPricingRepository pricingRepository) {
        this.pricingRepository = pricingRepository;
    }

    public BigDecimal calculateCost(
            long units,
            String metricName,
            BigDecimal tenantUnitRate) {

        PlatformPricing platformPricing = pricingRepository.findById(1)
                .orElse(null);
        BigDecimal perThousandRate = switch (metricName.toLowerCase(Locale.ROOT)) {
            case "llm_tokens" -> platformPricing == null
                    ? new BigDecimal("0.002000")
                    : platformPricing.getPricePer1kTokens();
            case "api_calls" -> platformPricing == null
                    ? new BigDecimal("0.005000")
                    : platformPricing.getPricePer1kApiCalls();
            default -> null;
        };

        BigDecimal calculated = perThousandRate == null
                ? tenantUnitRate.multiply(BigDecimal.valueOf(units))
                : perThousandRate
                        .multiply(BigDecimal.valueOf(units))
                        .divide(BigDecimal.valueOf(1000), 8, RoundingMode.HALF_UP);

        return calculated
                .setScale(4, RoundingMode.HALF_UP);
    }
}