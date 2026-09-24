package dto;

public record NormalizedUsage(long inputTokens, long outputTokens, long totalTokens) {
    public NormalizedUsage {
        if (totalTokens == 0) {
            totalTokens = inputTokens + outputTokens;
        }
    }
}
