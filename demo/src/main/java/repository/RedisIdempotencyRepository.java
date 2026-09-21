package repository;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

import java.time.Duration;

@Repository
public class RedisIdempotencyRepository implements IdempotencyRepository {

    private static final String KEY_PREFIX = "dedup:";

    private final StringRedisTemplate redisTemplate;

    public RedisIdempotencyRepository(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public boolean tryMarkAsProcessed(String tenantId, String eventId, Duration ttl) {

        String key = KEY_PREFIX + tenantId + ":" + eventId;

        Boolean inserted = redisTemplate
                .opsForValue()
                .setIfAbsent(key, "1", ttl);

        return Boolean.TRUE.equals(inserted);
    }
}
