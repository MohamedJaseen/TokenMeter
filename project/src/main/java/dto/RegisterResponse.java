package dto;

public record RegisterResponse(
        String tenantId,
        String username,
        String apiKey
) {
}