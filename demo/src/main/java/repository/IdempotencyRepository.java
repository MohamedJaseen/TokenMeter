package repository;

import java.time.Duration;

public interface IdempotencyRepository {

    boolean tryMarkAsProcessed(String tenantId, String eventId, Duration ttl);
}
