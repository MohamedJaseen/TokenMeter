package service;

import config.AiProviderProperties;
import dto.NormalizedAiResponse;
import dto.NormalizedUsage;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

abstract class OpenAiCompatibleAdapter implements AiProviderAdapter {
    private final String provider;
    private final AiProviderProperties.Provider properties;
    private final RestClient client = RestClient.builder().build();

    protected OpenAiCompatibleAdapter(String provider, AiProviderProperties.Provider properties) {
        this.provider = provider;
        this.properties = properties;
    }

    @Override public String provider() { return provider; }

    @Override
    public boolean isConfigured() {
        return properties.getApiKey() != null && !properties.getApiKey().isBlank();
    }

    @Override
    @SuppressWarnings("unchecked")
    public NormalizedAiResponse generate(String prompt, String requestedModel) {
        String model = requestedModel == null ? properties.getModel() : requestedModel;
        Map<String, Object> response = client.post()
                .uri(properties.getBaseUrl() + "/chat/completions")
                .header("Authorization", "Bearer " + properties.getApiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("model", model, "messages", List.of(Map.of("role", "user", "content", prompt))))
                .retrieve().body(Map.class);
        if (response == null) throw new IllegalStateException(provider + " returned an empty response");
        List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
        String text = "";
        if (choices != null && !choices.isEmpty()) {
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            if (message != null && message.get("content") != null) text = String.valueOf(message.get("content"));
        }
        Map<String, Object> usage = (Map<String, Object>) response.get("usage");
        long input = number(usage, "prompt_tokens");
        long output = number(usage, "completion_tokens");
        long total = number(usage, "total_tokens");
        return new NormalizedAiResponse(provider, String.valueOf(response.getOrDefault("model", model)),
                text, new NormalizedUsage(input, output, total));
    }

    private static long number(Map<String, Object> map, String key) {
        Object value = map == null ? null : map.get(key);
        return value instanceof Number n ? n.longValue() : value == null ? 0 : Long.parseLong(value.toString());
    }
}
