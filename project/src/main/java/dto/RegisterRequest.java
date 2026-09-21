package dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(min = 2, max = 64) String tenantId,
        @NotBlank @Size(min = 2, max = 255) String tenantName,
        @NotBlank @Size(min = 3, max = 128) String username,
        @NotBlank @Size(min = 6, max = 128) String password,
        @Email String email
) {
}