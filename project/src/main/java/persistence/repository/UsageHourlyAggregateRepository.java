package persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import persistence.entity.UsageHourlyAggregate;
import persistence.entity.UsageHourlyAggregateId;

import java.time.Instant;
import java.util.List;

public interface UsageHourlyAggregateRepository
        extends JpaRepository<UsageHourlyAggregate, UsageHourlyAggregateId> {

    List<UsageHourlyAggregate> findByTenantIdAndBucketHourBetween(
            String tenantId,
            Instant start,
            Instant end);

    List<UsageHourlyAggregate> findByTenantIdOrderByBucketHourAsc(
            String tenantId);
}