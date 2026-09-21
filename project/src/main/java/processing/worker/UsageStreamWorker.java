package processing.worker;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import processing.service.UsageProcessingService;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class UsageStreamWorker {

    private static final Logger log =
            LoggerFactory.getLogger(UsageStreamWorker.class);

    private static final String STREAM_KEY = "stream:usage:raw";
    private static final String GROUP = "metering-group";
    private static final String CONSUMER = "worker-1";

    /**
     * Messages that have been pending (delivered but unACKed) for
     * longer than this are considered abandoned and reclaimed.
     */
    private static final String MIN_PENDING_IDLE_MS = "5000";

    private static final int RECOVERY_LIMIT = 100;

    /*
     * XAUTOCLAIM <key> <group> <consumer> <min-idle-ms> <start-id> COUNT <n>
     * returns [next-cursor, claimed-entries, deleted-ids].
     * The script returns only the claimed entries.
     */
    private static final String XAUTOCLAIM_LUA = """
            local entries = redis.call(
                'XAUTOCLAIM', KEYS[1], ARGV[1], ARGV[2],
                ARGV[3], ARGV[4], 'COUNT', ARGV[5]
            )
            return entries[2]
            """;

    private final StringRedisTemplate redisTemplate;
    private final UsageProcessingService processingService;

    private final RedisScript<List> autoClaimScript =
            new DefaultRedisScript<>(XAUTOCLAIM_LUA, List.class);

    private volatile boolean groupCreated = false;

    public UsageStreamWorker(
            StringRedisTemplate redisTemplate,
            UsageProcessingService processingService) {

        this.redisTemplate = redisTemplate;
        this.processingService = processingService;
    }

    @Scheduled(fixedDelay = 2000)
    public void consume() {

        ensureGroup();

        /*
         * Recovery pass FIRST: claim messages that were delivered but
         * never ACKed (e.g. a worker crash or a transient database /
         * quota failure). If the recovered batch fails again it stays
         * pending and is retried on a later cycle (at-least-once).
         */
        List<MapRecord<String, Object, Object>> recovered = claimPending();
        if (recovered != null && !recovered.isEmpty()) {
            if (!processAndAck(recovered, "XAUTOCLAIM recovered")) {
                return;
            }
        }

        processNew();
    }

    private void processNew() {

        List<MapRecord<String, Object, Object>> records =
                redisTemplate.opsForStream().read(
                        Consumer.from(GROUP, CONSUMER),
                        StreamReadOptions
                                .empty()
                                .count(100)
                                .block(Duration.ofSeconds(2)),
                        StreamOffset.create(
                                STREAM_KEY,
                                ReadOffset.lastConsumed()
                        )
                );

        if (records == null || records.isEmpty()) {
            return;
        }

        processAndAck(records, "live");
    }

    @SuppressWarnings("unchecked")
    private List<MapRecord<String, Object, Object>> claimPending() {

        List<Object> raw;
        try {
            raw = redisTemplate.execute(
                    autoClaimScript,
                    List.of(STREAM_KEY),
                    GROUP, CONSUMER, MIN_PENDING_IDLE_MS, "0",
                    String.valueOf(RECOVERY_LIMIT)
            );
        } catch (Exception e) {
            log.warn("XAUTOCLAIM could not be executed", e);
            return List.of();
        }

        if (raw == null || raw.isEmpty()) {
            return List.of();
        }

        List<MapRecord<String, Object, Object>> recovered =
                new ArrayList<>();

        /*
         * Lua translates the XAUTOCLAIM reply into nested lists:
         * each claimed entry is [id, [field, value, field, value, ...]].
         */
        for (Object obj : raw) {

            if (!(obj instanceof List<?> entry) || entry.size() < 2) {
                continue;
            }

            String id = String.valueOf(entry.get(0));

            if (!(entry.get(1) instanceof List<?> fieldValues)) {
                continue;
            }

            Map<Object, Object> fields = new LinkedHashMap<>();
            for (int i = 0; i + 1 < fieldValues.size(); i += 2) {
                fields.put(
                        fieldValues.get(i),
                        fieldValues.get(i + 1));
            }

            recovered.add(
                    MapRecord.create(STREAM_KEY, fields)
                            .withId(RecordId.of(id))
                            .withStreamKey(STREAM_KEY)
            );
        }

        return recovered;
    }

    private boolean processAndAck(
            List<MapRecord<String, Object, Object>> records,
            String source) {

        try {

            /*
             * 1. Deserialize
             * 2. Aggregate
             * 3. Quota evaluation (HTTP call to quota service)
             * 4. PostgreSQL upsert
             *
             * Returns only after the database write succeeds.
             */
            processingService.processBatch(records);

            /*
             * ONLY here do we acknowledge.
             */
            RecordId[] recordIds =
                    records.stream()
                            .map(MapRecord::getId)
                            .toArray(RecordId[]::new);

            redisTemplate.opsForStream().acknowledge(
                    STREAM_KEY,
                    GROUP,
                    recordIds
            );

            log.info(
                    "Successfully processed and ACKed {} records ({})",
                    records.size(),
                    source
            );

            return true;

        } catch (Exception e) {

            /*
             * IMPORTANT: Do NOT XACK the whole batch here.
             *
             * A single unprocessable record (e.g. a usage event for a
             * tenant with no quota configuration) must not block every
             * other record in the batch. Fall back to per-record
             * processing: records that succeed individually are ACKed,
             * the failing record(s) stay pending and are retried by the
             * XAUTOCLAIM pass (at-least-once, poison isolated).
             */
            log.error(
                    "{}: batch processing failed ({} records). "
                            + "Isolating individual records; failures left pending for "
                            + "XAUTOCLAIM recovery.",
                    source,
                    records.size(),
                    e
            );

            return isolateFailures(records, source);
        }
    }

    private boolean isolateFailures(
            List<MapRecord<String, Object, Object>> records,
            String source) {

        boolean anyProcessed = false;
        List<RecordId> acked = new ArrayList<>();

        for (MapRecord<String, Object, Object> record : records) {

            try {
                processingService.processBatch(List.of(record));
                acked.add(record.getId());
                anyProcessed = true;

            } catch (Exception perRecordException) {
                log.error(
                        "{}: record {} failed processing and stays pending "
                                + "for XAUTOCLAIM recovery.",
                        source,
                        record.getId(),
                        perRecordException
                );
            }
        }

        if (!acked.isEmpty()) {
            redisTemplate.opsForStream().acknowledge(
                    STREAM_KEY,
                    GROUP,
                    acked.toArray(new RecordId[0])
            );

            log.warn(
                    "{}: isolated {} failed record(s) from a batch of {}; "
                            + "ACKed the other {}.",
                    source,
                    records.size() - acked.size(),
                    records.size(),
                    acked.size()
            );
        }

        return anyProcessed;
    }

    private void ensureGroup() {

        if (groupCreated) {
            return;
        }

        try {
            redisTemplate.opsForStream().createGroup(
                    STREAM_KEY,
                    ReadOffset.from("0"),
                    GROUP
            );
        } catch (Exception e) {
            log.debug("Consumer group already exists: {}", e.getMessage());
        }

        groupCreated = true;
    }
}