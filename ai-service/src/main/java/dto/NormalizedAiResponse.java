package dto;

public record NormalizedAiResponse(String provider, String model, String text,
                                   NormalizedUsage usage) {
}
