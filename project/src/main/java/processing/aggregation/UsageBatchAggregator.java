package processing.aggregation;

import org.springframework.stereotype.Component;
import persistence.aggregation.AggregateKey;

import java.time.temporal.ChronoUnit;
import java.util.Map;

@Component
public class UsageBatchAggregator {

    public Map<AggregateKey, Long> aggregate(
            Map<AggregateKey, Long> existing,
            String tenantId,
            String metricName,
            java.time.Instant timestamp,
            long units) {

        AggregateKey key = new AggregateKey(
                tenantId,
                metricName,
                timestamp.truncatedTo(ChronoUnit.HOURS)
        );

        existing.merge(
                key,
                units,
                Long::sum
        );

        return existing;
    }
}