package processing.billing;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentSubmittedEvent(
        UUID invoiceId,
        String tenantId,
        String tenantName,
        String tenantEmail,
        BigDecimal amount,
        Instant submittedAt
) {
}
