package persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import persistence.entity.TenantApiKey;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface TenantApiKeyRepository
        extends JpaRepository<TenantApiKey, UUID> {

    Optional<TenantApiKey> findByKeyHashAndRevokedFalse(String keyHash);

    @Query(value = """
            SELECT api_key.*
            FROM api_keys api_key
            JOIN tenants tenant ON tenant.tenant_id = api_key.tenant_id
            WHERE api_key.key_hash = :keyHash
              AND api_key.revoked = FALSE
              AND tenant.status = 'ACTIVE'
            """, nativeQuery = true)
    Optional<TenantApiKey> findActiveTenantKeyByHash(
            @Param("keyHash") String keyHash);
}