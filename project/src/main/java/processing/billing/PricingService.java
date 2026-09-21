package processing.billing;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class PricingService {

    public BigDecimal calculateCost(
            long units,
            BigDecimal unitRate) {

        return unitRate
                .multiply(BigDecimal.valueOf(units))
                .setScale(4, RoundingMode.HALF_UP);
    }
}