package service;

import exception.InvalidApiKeyException;
import org.junit.jupiter.api.Test;
import persistence.entity.TenantApiKey;
import persistence.repository.TenantApiKeyRepository;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ApiKeyServiceTest {

    private final TenantApiKeyRepository repository =
            mock(TenantApiKeyRepository.class);

    private final ApiKeyService apiKeyService =
            new ApiKeyService(repository);

    @Test
    void resolvesKnownKeyToTenant() {

        TenantApiKey key = new TenantApiKey();
        key.setKeyHash(ApiKeyService.hash("key_123"));
        key.setTenantId("tenantA");

        when(repository.findByKeyHashAndRevokedFalse(anyString()))
                .thenReturn(Optional.of(key));

        assertEquals("tenantA", apiKeyService.resolveTenant("key_123"));
    }

    @Test
    void rejectsMissingKey() {
        InvalidApiKeyException ex = assertThrows(
                InvalidApiKeyException.class,
                () -> apiKeyService.resolveTenant(null));
        assertEquals("Missing X-API-KEY", ex.getMessage());

        ex = assertThrows(
                InvalidApiKeyException.class,
                () -> apiKeyService.resolveTenant("  "));
        assertEquals("Missing X-API-KEY", ex.getMessage());
    }

    @Test
    void rejectsUnknownKey() {

        when(repository.findByKeyHashAndRevokedFalse(anyString()))
                .thenReturn(Optional.empty());

        InvalidApiKeyException ex = assertThrows(
                InvalidApiKeyException.class,
                () -> apiKeyService.resolveTenant("wrong_key"));
        assertEquals("Invalid API key", ex.getMessage());
    }

    @Test
    void rejectsRevokedKey() {

        TenantApiKey key = new TenantApiKey();
        key.setKeyHash(ApiKeyService.hash("key_456"));
        key.setTenantId("tenantB");
        key.setRevoked(true);
        key.setCreatedAt(Instant.now());

        when(repository.findByKeyHashAndRevokedFalse(anyString()))
                .thenReturn(Optional.empty());

        assertThrows(
                InvalidApiKeyException.class,
                () -> apiKeyService.resolveTenant("key_456"));
    }
}