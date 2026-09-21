package persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import persistence.entity.Tenant;

public interface TenantRepository
        extends JpaRepository<Tenant, String> {
}