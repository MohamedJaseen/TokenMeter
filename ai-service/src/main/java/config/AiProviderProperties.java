package config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ai")
public class AiProviderProperties {
    private String defaultProvider = "GEMINI";
    private Provider gemini = new Provider();
    private Provider openai = new Provider();
    private Provider anthropic = new Provider();
    private Provider groq = new Provider();
    private Provider mistral = new Provider();

    public String getDefaultProvider() { return defaultProvider; }
    public void setDefaultProvider(String value) { defaultProvider = value; }
    public Provider getGemini() { return gemini; }
    public void setGemini(Provider value) { gemini = value; }
    public Provider getOpenai() { return openai; }
    public void setOpenai(Provider value) { openai = value; }
    public Provider getAnthropic() { return anthropic; }
    public void setAnthropic(Provider value) { anthropic = value; }
    public Provider getGroq() { return groq; }
    public void setGroq(Provider value) { groq = value; }
    public Provider getMistral() { return mistral; }
    public void setMistral(Provider value) { mistral = value; }

    public static class Provider {
        private String apiKey;
        private String baseUrl;
        private String model;
        public String getApiKey() { return apiKey; }
        public void setApiKey(String value) { apiKey = value; }
        public String getBaseUrl() { return baseUrl; }
        public void setBaseUrl(String value) { baseUrl = value; }
        public String getModel() { return model; }
        public void setModel(String value) { model = value; }
    }
}
