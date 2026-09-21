package service;

public record IngestionResult(
        String status,
        String eventId
) {

    public static IngestionResult queued(String eventId) {
        return new IngestionResult("QUEUED", eventId);
    }

    public static IngestionResult duplicate(String eventId) {
        return new IngestionResult("DUPLICATE_IGNORED", eventId);
    }
}
