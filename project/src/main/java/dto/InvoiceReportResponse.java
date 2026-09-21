package dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record InvoiceReportResponse(
        UUID invoiceId,
        String tenantId,
        LocalDate billingPeriodStart,
        LocalDate billingPeriodEnd,
        long totalUnitsConsumed,
        BigDecimal totalAmountBilled,
        String paymentStatus,
        Instant createdAt
) {
}