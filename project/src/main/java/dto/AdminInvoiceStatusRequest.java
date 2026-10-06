package dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AdminInvoiceStatusRequest(
        @NotBlank @Pattern(regexp = "PENDING|PAYMENT_SUBMITTED|PAID|FAILED") String paymentStatus
) {
}
