package dto;

import java.time.Instant;
import java.util.UUID;

public record ApiKeyResponse(
        UUID keyId,
        String tenantId,
        String prefix,
        String label,
        boolean revoked,
        Instant createdAt,
        Instant lastUsedAt,
        String secret
) {
    public static ApiKeyResponse withoutSecret(UUID keyId, String tenantId, String prefix,
                                               String label, boolean revoked, Instant createdAt,
                                               Instant lastUsedAt) {
        return new ApiKeyResponse(keyId, tenantId, prefix, label, revoked, createdAt, lastUsedAt, null);
    }

    public static ApiKeyResponse withSecret(UUID keyId, String tenantId, String prefix,
                                            String label, String secret) {
        return new ApiKeyResponse(keyId, tenantId, prefix, label, false, null, null, secret);
    }
}