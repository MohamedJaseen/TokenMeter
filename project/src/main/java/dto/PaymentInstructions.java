package dto;

import java.math.BigDecimal;
import java.util.UUID;

public record PaymentInstructions(
        UUID invoiceId,
        BigDecimal amount,
        String currency,
        String qrImageUrl,
        String paymentStatus
) {
}
