package processing.billing;

import java.math.BigDecimal;
import java.util.UUID;

public record InvoiceVerificationEvent(
        UUID invoiceId,
        String tenantId,
        String tenantName,
        String tenantEmail,
        BigDecimal amount,
        String paymentStatus
) {
}
