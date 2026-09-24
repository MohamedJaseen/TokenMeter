package service;

import config.AiProviderProperties;
import dto.NormalizedAiResponse;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import exception.ProviderNotConfiguredException;

@Service
public class AiProviderRouter {
    private final AiProviderProperties properties;
    private final Map<String, AiProviderAdapter> adapters;
    public AiProviderRouter(AiProviderProperties properties, List<AiProviderAdapter> adapters) {
        this.properties = properties;
        this.adapters = adapters.stream().collect(Collectors.toUnmodifiableMap(
                a -> a.provider().toUpperCase(Locale.ROOT), Function.identity()));
    }
    public NormalizedAiResponse generate(String provider, String prompt, String model) {
        String selected = provider == null || provider.isBlank() ? properties.getDefaultProvider() : provider;
        AiProviderAdapter adapter = adapters.get(selected.toUpperCase(Locale.ROOT));
        if (adapter == null) throw new IllegalArgumentException("Unsupported AI provider: " + selected);
        if (!adapter.isConfigured()) {
            throw new ProviderNotConfiguredException(selected);
        }
        return adapter.generate(prompt, model);
    }
}
