package persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import persistence.entity.PlatformPricing;

public interface PlatformPricingRepository
        extends JpaRepository<PlatformPricing, Integer> {
}