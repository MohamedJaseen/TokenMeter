package service;
import config.AiProviderProperties;
import org.springframework.stereotype.Service;
@Service
public class GroqService extends OpenAiCompatibleAdapter {
    public GroqService(AiProviderProperties p) { super("GROQ", p.getGroq()); }
}
