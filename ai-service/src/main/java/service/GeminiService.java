package service;

import dto.GeminiResponse;
import dto.NormalizedAiResponse;
import dto.NormalizedUsage;
import config.AiProviderProperties;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class GeminiService implements AiProviderAdapter {

    private final RestClient restClient;
    private final String apiKey;
    private final String baseUrl;
    private final String model;

    public GeminiService(AiProviderProperties properties) {
        AiProviderProperties.Provider provider = properties.getGemini();

        this.restClient = RestClient.builder().build();
        this.apiKey = provider.getApiKey();
        this.baseUrl = provider.getBaseUrl();
        this.model = provider.getModel();
    }

    @Override
    public String provider() { return "GEMINI"; }

    @Override
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    public NormalizedAiResponse generate(String prompt, String requestedModel) {
        GeminiResponse response = generateGemini(prompt, requestedModel);
        GeminiResponse.UsageMetadata usage = response.usageMetadata();
        if (usage == null) throw new IllegalStateException("Gemini response did not contain usage metadata");
        return new NormalizedAiResponse(provider(), response.modelVersion(),
                extractText(response), new NormalizedUsage(usage.promptTokenCount(),
                usage.candidatesTokenCount(), usage.totalTokenCount()));
    }

    public GeminiResponse generate(String prompt) {
        return generateGemini(prompt, null);
    }

    private GeminiResponse generateGemini(String prompt, String requestedModel) {

        Map<String, Object> request = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of("maxOutputTokens", 512)
        );

        String endpoint =
                baseUrl + "/v1beta/models/" + (requestedModel == null ? model : requestedModel) + ":generateContent";

        GeminiResponse response =
                restClient.post()
                        .uri(endpoint)
                        .header("x-goog-api-key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(request)
                        .retrieve()
                        .body(GeminiResponse.class);

        if (response == null) {
            throw new IllegalStateException(
                    "Gemini returned an empty response");
        }

        return response;
    }

    private String extractText(GeminiResponse response) {
        if (response.candidates() == null) return "";
        StringBuilder text = new StringBuilder();
        for (GeminiResponse.Candidate candidate : response.candidates()) {
            if (candidate == null || candidate.content() == null || candidate.content().parts() == null) continue;
            for (GeminiResponse.Part part : candidate.content().parts()) {
                if (part != null && part.text() != null) {
                    if (text.length() > 0) text.append('\n');
                    text.append(part.text());
                }
            }
        }
        return text.toString();
    }
}