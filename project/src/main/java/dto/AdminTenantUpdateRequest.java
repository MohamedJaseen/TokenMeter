package dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminTenantUpdateRequest(
        @NotBlank @Size(max = 255) String tenantName,
        @Email String contactEmail
) {
}
