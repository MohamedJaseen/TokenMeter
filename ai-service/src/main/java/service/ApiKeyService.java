package service;

import exception.InvalidApiKeyException;
import org.springframework.stereotype.Service;
import persistence.entity.TenantApiKey;
import persistence.repository.TenantApiKeyRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class ApiKeyService {

    private final TenantApiKeyRepository apiKeyRepository;

    public ApiKeyService(TenantApiKeyRepository apiKeyRepository) {
        this.apiKeyRepository = apiKeyRepository;
    }

    public String resolveTenant(String apiKey) {

        if (apiKey == null || apiKey.isBlank()) {
            throw new InvalidApiKeyException("Missing X-API-KEY");
        }

        Optional<TenantApiKey> key =
                apiKeyRepository.findByKeyHashAndRevokedFalse(hash(apiKey));

        if (key.isEmpty()) {
            throw new InvalidApiKeyException("Invalid API key");
        }

        return key.get().getTenantId();
    }

    public static String hash(String secret) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(secret.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to hash API key", e);
        }
    }
}