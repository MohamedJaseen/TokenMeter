package dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record AdminInvoiceStatusRequest(
        @NotBlank @Pattern(regexp = "PENDING|PAID|FAILED") String paymentStatus
) {
}
