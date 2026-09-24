package service;

import config.AiProviderProperties;
import dto.NormalizedAiResponse;
import dto.NormalizedUsage;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.List;
import java.util.Map;

@Service
public class AnthropicService implements AiProviderAdapter {
    private final AiProviderProperties.Provider properties;
    private final RestClient client = RestClient.builder().build();
    public AnthropicService(AiProviderProperties p) { properties = p.getAnthropic(); }
    @Override public String provider() { return "ANTHROPIC"; }
    @Override public boolean isConfigured() {
        return properties.getApiKey() != null && !properties.getApiKey().isBlank();
    }
    @Override
    @SuppressWarnings("unchecked")
    public NormalizedAiResponse generate(String prompt, String requestedModel) {
        String model = requestedModel == null ? properties.getModel() : requestedModel;
        Map<String, Object> response = client.post()
                .uri(properties.getBaseUrl() + "/messages")
                .header("x-api-key", properties.getApiKey())
                .header("anthropic-version", "2023-06-01")
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("model", model, "max_tokens", 512,
                        "messages", List.of(Map.of("role", "user", "content", prompt))))
                .retrieve().body(Map.class);
        if (response == null) throw new IllegalStateException("ANTHROPIC returned an empty response");
        StringBuilder text = new StringBuilder();
        List<Map<String, Object>> content = (List<Map<String, Object>>) response.get("content");
        if (content != null) for (Map<String, Object> part : content) {
            if (part.get("text") != null) {
                if (text.length() > 0) text.append('\n');
                text.append(part.get("text"));
            }
        }
        Map<String, Object> usage = (Map<String, Object>) response.get("usage");
        long input = number(usage, "input_tokens"), output = number(usage, "output_tokens");
        return new NormalizedAiResponse(provider(), String.valueOf(response.getOrDefault("model", model)),
                text.toString(), new NormalizedUsage(input, output, input + output));
    }
    private static long number(Map<String, Object> map, String key) {
        Object value = map == null ? null : map.get(key);
        return value instanceof Number n ? n.longValue() : value == null ? 0 : Long.parseLong(value.toString());
    }
}
