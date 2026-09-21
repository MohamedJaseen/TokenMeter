package alert;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Component
public class RedisQuotaAlertPublisher implements QuotaAlertPublisher {

    private static final Logger log =
            LoggerFactory.getLogger(RedisQuotaAlertPublisher.class);

    private static final String CHANNEL = "quota-alerts";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public RedisQuotaAlertPublisher(
            StringRedisTemplate redisTemplate,
            ObjectMapper objectMapper) {

        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public void publish(QuotaAlertEvent event) {

        try {
            String payload =
                    objectMapper.writeValueAsString(event);

            redisTemplate.convertAndSend(CHANNEL, payload);

            log.info(
                    "Published quota alert for tenant {} | status={} | "
                            + "usage={} / limit={} ({}%)",
                    event.tenantId(),
                    event.status(),
                    event.currentUsage(),
                    event.monthlyLimit(),
                    event.usagePercentage());

        } catch (JacksonException e) {
            log.error("Failed to serialize quota alert event", e);
        } catch (Exception e) {
            log.error(
                    "Failed to publish quota alert for tenant {}",
                    event.tenantId(),
                    e);
        }
    }
}