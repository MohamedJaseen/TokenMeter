package service;
import config.AiProviderProperties;
import org.springframework.stereotype.Service;
@Service
public class MistralService extends OpenAiCompatibleAdapter {
    public MistralService(AiProviderProperties p) { super("MISTRAL", p.getMistral()); }
}
