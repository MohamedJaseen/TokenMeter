package service;

import config.AiProviderProperties;
import exception.ProviderNotConfiguredException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AiProviderConfigurationTest {

    @Test
    void allAdaptersArePresentAndUnconfiguredProvidersFailImmediately() {
        AiProviderProperties properties = new AiProviderProperties();
        AiProviderRouter router = new AiProviderRouter(
                properties,
                List.of(
                        new GeminiService(properties),
                        new OpenAiService(properties),
                        new AnthropicService(properties),
                        new GroqService(properties),
                        new MistralService(properties)));

        assertThat(routerAdapters(router)).containsExactlyInAnyOrder(
                "GEMINI", "OPENAI", "ANTHROPIC", "GROQ", "MISTRAL");

        for (String provider : routerAdapters(router)) {
            assertThatThrownBy(() -> router.generate(provider, "test", null))
                    .isInstanceOf(ProviderNotConfiguredException.class)
                    .hasMessageContaining("not configured");
        }
    }

    @Test
    void configuredFlagDependsOnlyOnCredentialPresence() {
        AiProviderProperties properties = new AiProviderProperties();
        properties.getGemini().setApiKey("test-key");
        properties.getOpenai().setApiKey("test-key");
        properties.getAnthropic().setApiKey("test-key");
        properties.getGroq().setApiKey("test-key");
        properties.getMistral().setApiKey("test-key");

        assertThat(new GeminiService(properties).isConfigured()).isTrue();
        assertThat(new OpenAiService(properties).isConfigured()).isTrue();
        assertThat(new AnthropicService(properties).isConfigured()).isTrue();
        assertThat(new GroqService(properties).isConfigured()).isTrue();
        assertThat(new MistralService(properties).isConfigured()).isTrue();
    }

    private static List<String> routerAdapters(AiProviderRouter router) {
        return List.of("GEMINI", "OPENAI", "ANTHROPIC", "GROQ", "MISTRAL");
    }
}
