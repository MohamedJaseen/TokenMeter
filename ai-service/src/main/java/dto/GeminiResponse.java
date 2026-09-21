package dto;

import java.util.List;

/*
 * Shapes for the Gemini generateContent reply
 * (POST /v1beta/models/{model}:generateContent).
 *
 * Jackson binds the camelCase keys (usageMetadata, promptTokenCount,
 * candidatesTokenCount, totalTokenCount) to record components with
 * matching names. Unknown fields are ignored by Spring Boot's
 * configured ObjectMapper.
 */
public record GeminiResponse(
        List<Candidate> candidates,
        UsageMetadata usageMetadata,
        String modelVersion
) {

    public record Candidate(
            Content content
    ) {
    }

    public record Content(
            List<Part> parts
    ) {
    }

    public record Part(
            String text
    ) {
    }

    public record UsageMetadata(
            long promptTokenCount,
            long candidatesTokenCount,
            long totalTokenCount
    ) {
    }
}