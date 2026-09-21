package repository;

import org.springframework.data.jpa.repository.JpaRepository;
import domain.TenantQuotaConfig;

public interface TenantQuotaConfigRepository
        extends JpaRepository<TenantQuotaConfig, String> {
}