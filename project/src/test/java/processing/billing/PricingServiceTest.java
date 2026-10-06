package processing.billing;

import org.junit.jupiter.api.Test;
import persistence.entity.PlatformPricing;
import persistence.repository.PlatformPricingRepository;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PricingServiceTest {

    private final PlatformPricingRepository repository =
            mock(PlatformPricingRepository.class);
    private final PricingService pricingService = new PricingService(repository);

    @Test
    void usesPlatformPerThousandRatesForTokensAndApiCalls() {
        PlatformPricing pricing = new PlatformPricing();
        pricing.setPricePer1kTokens(new BigDecimal("0.002000"));
        pricing.setPricePer1kApiCalls(new BigDecimal("0.005000"));
        when(repository.findById(1)).thenReturn(Optional.of(pricing));

        assertEquals(
                new BigDecimal("0.0020"),
                pricingService.calculateCost(1000, "llm_tokens", BigDecimal.ONE));
        assertEquals(
                new BigDecimal("0.0025"),
                pricingService.calculateCost(500, "API_CALLS", BigDecimal.ONE));
    }

    @Test
    void usesTenantUnitRateForOtherMetrics() {
        when(repository.findById(1)).thenReturn(Optional.empty());

        assertEquals(
                new BigDecimal("0.0300"),
                pricingService.calculateCost(
                        3,
                        "storage_units",
                        new BigDecimal("0.01")));
    }
}
