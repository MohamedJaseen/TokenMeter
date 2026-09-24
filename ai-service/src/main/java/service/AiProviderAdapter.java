package service;

import dto.NormalizedAiResponse;

public interface AiProviderAdapter {
    String provider();
    boolean isConfigured();
    NormalizedAiResponse generate(String prompt, String model);
}
