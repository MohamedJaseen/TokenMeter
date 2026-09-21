package messaging;

import domain.UsageEvent;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

@Component
public class RedisUsageStreamPublisher implements UsageStreamPublisher {

    private static final String STREAM_KEY = "stream:usage:raw";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public RedisUsageStreamPublisher(
            StringRedisTemplate redisTemplate,
            ObjectMapper objectMapper) {

        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public void publish(UsageEvent event) {

        try {
            String payload = objectMapper.writeValueAsString(event);

            redisTemplate.opsForStream().add(
                    MapRecord.create(
                            STREAM_KEY,
                            Map.of("payload", payload)
                    )
            );

        } catch (JacksonException e) {
            throw new RuntimeException(
                    "Failed to serialize usage event",
                    e
            );
        }
    }
}
