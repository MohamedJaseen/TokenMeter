package service;
import config.AiProviderProperties;
import org.springframework.stereotype.Service;
@Service
public class OpenAiService extends OpenAiCompatibleAdapter {
    public OpenAiService(AiProviderProperties p) { super("OPENAI", p.getOpenai()); }
}
