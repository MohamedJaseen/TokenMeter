package persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import persistence.entity.TenantApiKey;

import java.util.Optional;
import java.util.UUID;

public interface TenantApiKeyRepository
        extends JpaRepository<TenantApiKey, UUID> {

    Optional<TenantApiKey> findByKeyHashAndRevokedFalse(String keyHash);
}