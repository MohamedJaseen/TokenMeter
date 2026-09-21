package processing.billing;

import java.math.BigDecimal;

public record BillingLineItem(
        String metricName,
        long consumedUnits,
        BigDecimal unitRate,
        BigDecimal subtotal
) {
}