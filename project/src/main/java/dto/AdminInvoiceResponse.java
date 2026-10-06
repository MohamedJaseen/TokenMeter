package dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record AdminInvoiceResponse(
        UUID invoiceId,
        String tenantId,
        String tenantName,
        LocalDate billingPeriodStart,
        LocalDate billingPeriodEnd,
        long totalUnitsConsumed,
        BigDecimal totalAmountBilled,
        String paymentStatus,
        Instant createdAt
) {
}
