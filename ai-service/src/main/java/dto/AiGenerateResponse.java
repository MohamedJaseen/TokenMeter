package dto;

public record AiGenerateResponse(
        String responseId,
        String model,
        String tenantId,
        String text,
        long inputTokens,
        long outputTokens,
        long totalTokens
) {
}