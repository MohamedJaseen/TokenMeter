package redis;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.YearMonth;
import java.time.ZoneOffset;

@Component
public class QuotaCounterRepository {

    private static final String COUNTER_PREFIX = "quota:";
    private static final String ALERT_PREFIX = "quota-alert:";

    private final StringRedisTemplate redisTemplate;

    public QuotaCounterRepository(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public String currentMonth() {
        return YearMonth.now(ZoneOffset.UTC).toString();
    }

    public long increment(String tenantId, String month, long units) {

        String key = counterKey(tenantId, month);

        Long updated = redisTemplate.opsForValue().increment(key, units);

        if (updated == null) {
            throw new IllegalStateException(
                    "Unable to update quota counter in Redis for key " + key);
        }

        return updated;
    }

    public long get(String tenantId, String month) {

        String value =
                redisTemplate.opsForValue()
                        .get(counterKey(tenantId, month));

        return value == null ? 0L : Long.parseLong(value);
    }

    public boolean tryAcquireAlert(
            String tenantId,
            String month,
            int threshold,
            Duration ttl) {

        String key = alertKey(tenantId, month, threshold);

        Boolean acquired =
                redisTemplate.opsForValue()
                        .setIfAbsent(key, "1", ttl);

        return Boolean.TRUE.equals(acquired);
    }

    public static String counterKey(String tenantId, String month) {
        return COUNTER_PREFIX + tenantId + ":" + month;
    }

    public static String alertKey(String tenantId, String month, int threshold) {
        return ALERT_PREFIX + tenantId + ":" + month + ":" + threshold;
    }
}