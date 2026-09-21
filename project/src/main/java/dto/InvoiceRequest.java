package dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record InvoiceRequest(
        @NotNull(message = "periodStart is required")
        @JsonFormat(pattern = "yyyy-MM-dd")
        LocalDate periodStart,

        @NotNull(message = "periodEnd is required")
        @JsonFormat(pattern = "yyyy-MM-dd")
        LocalDate periodEnd
) {
}