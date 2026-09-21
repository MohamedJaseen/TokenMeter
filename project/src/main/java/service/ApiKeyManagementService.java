package service;

import dto.ApiKeyResponse;
import exception.AuthException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import persistence.entity.TenantApiKey;
import persistence.repository.TenantApiKeyRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
public class ApiKeyManagementService {

    private static final String KEY_PREFIX = "sec_live_";
    private static final int SECRET_BYTES = 24;

    private final TenantApiKeyRepository apiKeyRepository;

    public ApiKeyManagementService(TenantApiKeyRepository apiKeyRepository) {
        this.apiKeyRepository = apiKeyRepository;
    }

    @Transactional
    public ApiKeyResponse create(String tenantId, String label) {

        String secret = KEY_PREFIX + randomSecret();

        TenantApiKey entity = new TenantApiKey();
        entity.setTenantId(tenantId);
        entity.setKeyHash(hash(secret));
        entity.setPrefix(secret.substring(0, Math.min(secret.length(), 24)));
        entity.setLabel(label == null || label.isBlank() ? "Default key" : label);
        entity.setRevoked(false);
        entity.setCreatedAt(Instant.now());

        TenantApiKey saved = apiKeyRepository.save(entity);

        return ApiKeyResponse.withSecret(
                saved.getKeyId(),
                saved.getTenantId(),
                saved.getPrefix(),
                saved.getLabel(),
                secret);
    }

    public List<ApiKeyResponse> list(String tenantId) {

        return apiKeyRepository
                .findByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(key -> ApiKeyResponse.withoutSecret(
                        key.getKeyId(),
                        key.getTenantId(),
                        key.getPrefix(),
                        key.getLabel(),
                        key.isRevoked(),
                        key.getCreatedAt(),
                        key.getLastUsedAt()))
                .toList();
    }

    @Transactional
    public void revoke(String tenantId, UUID keyId) {

        TenantApiKey key = apiKeyRepository.findById(keyId)
                .orElseThrow(() ->
                        AuthException.notFound("API key not found"));

        if (!key.getTenantId().equals(tenantId)) {
            throw AuthException.notFound("API key not found");
        }

        key.setRevoked(true);
        apiKeyRepository.save(key);
    }

    public void touch(String keyHash) {
        apiKeyRepository.findByKeyHash(keyHash)
                .ifPresent(key -> {
                    key.setLastUsedAt(Instant.now());
                    apiKeyRepository.save(key);
                });
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

    private String randomSecret() {
        byte[] bytes = new byte[SECRET_BYTES];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}