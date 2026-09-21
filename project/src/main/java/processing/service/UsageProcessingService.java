package processing.service;

import domain.UsageEvent;
import dto.QuotaEvaluationResult;
import dto.RealtimeEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.stereotype.Service;
import persistence.aggregation.AggregateKey;
import persistence.service.UsagePersistenceService;
import processing.aggregation.UsageBatchAggregator;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class UsageProcessingService {

    private static final Logger log =
            LoggerFactory.getLogger(UsageProcessingService.class);

    private final ObjectMapper objectMapper;
    private final UsageBatchAggregator aggregator;
    private final UsagePersistenceService persistenceService;
    private final QuotaClient quotaClient;
    private final RealtimeEventBus realtimeEventBus;

    public UsageProcessingService(
            ObjectMapper objectMapper,
            UsageBatchAggregator aggregator,
            UsagePersistenceService persistenceService,
            QuotaClient quotaClient,
            RealtimeEventBus realtimeEventBus) {

        this.objectMapper = objectMapper;
        this.aggregator = aggregator;
        this.persistenceService = persistenceService;
        this.quotaClient = quotaClient;
        this.realtimeEventBus = realtimeEventBus;
    }

    public void processBatch(
            List<MapRecord<String, Object, Object>> records) {

        if (records == null || records.isEmpty()) {
            return;
        }

        Map<AggregateKey, Long> rollups = new HashMap<>();
        List<UsageEvent> events = new ArrayList<>();

        for (MapRecord<String, Object, Object> record : records) {

            String payload =
                    String.valueOf(record.getValue().get("payload"));

            UsageEvent event = deserialize(payload);
            events.add(event);

            aggregator.aggregate(
                    rollups,
                    event.tenantId(),
                    event.metricName(),
                    event.timestamp(),
                    event.units()
            );
        }

        /*
         * Quota evaluation happens AFTER aggregation and BEFORE
         * PostgreSQL persistence. The Quota Service maintains the
         * monthly Redis counter (atomic INCRBY) and returns the
         * evaluation result; a failure throws and prevents the
         * worker from acknowledging the batch.
         */
        evaluateQuotas(rollups);

        /*
         * PostgreSQL persistence happens BEFORE the worker can XACK.
         * If this throws, processBatch does not return and the
         * worker will NOT acknowledge the messages.
         */
        persistenceService.persist(rollups);

        /*
         * Only now that the data is committed do we broadcast to any
         * connected Realtime SSE subscribers.
         */
        for (UsageEvent event : events) {
            realtimeEventBus.publish(RealtimeEvent.from(event));
        }
    }

    private void evaluateQuotas(Map<AggregateKey, Long> rollups) {

        Map<String, Long> tenantTotals = new HashMap<>();

        rollups.forEach(
                (key, units) ->
                        tenantTotals.merge(
                                key.tenantId(),
                                units,
                                Long::sum));

        for (Map.Entry<String, Long> entry : tenantTotals.entrySet()) {

            QuotaEvaluationResult result =
                    quotaClient.evaluate(
                            entry.getKey(),
                            "aggregate",
                            entry.getValue());

            if ("EXCEEDED".equals(result.status())) {
                log.warn(
                        "Quota EXCEEDED for tenant {} | "
                                + "usage={}, limit={} ({}% used) | "
                                + "hardCap={}",
                        result.tenantId(),
                        result.currentUsage(),
                        result.monthlyLimit(),
                        result.usagePercentage(),
                        result.hardCapEnabled());

            } else if ("WARNING".equals(result.status())) {
                log.warn(
                        "Quota WARNING for tenant {} | "
                                + "usage={}, limit={} ({}% used)",
                        result.tenantId(),
                        result.currentUsage(),
                        result.monthlyLimit(),
                        result.usagePercentage());
            }
        }
    }

    private UsageEvent deserialize(String payload) {

        try {
            return objectMapper.readValue(
                    payload,
                    UsageEvent.class
            );

        } catch (JacksonException e) {
            throw new RuntimeException(
                    "Failed to deserialize usage event payload",
                    e
            );
        }
    }
}