package processing.service;

import dto.RealtimeEvent;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Component
public class RealtimeEventBus {

    private static final Logger log =
            LoggerFactory.getLogger(RealtimeEventBus.class);

    private static final long HEARTBEAT_INTERVAL_SECONDS = 15;

    private final ConcurrentHashMap<String, Set<SseEmitter>> registry =
            new ConcurrentHashMap<>();

    private final ScheduledExecutorService heartbeatScheduler =
            Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "realtime-heartbeat");
                t.setDaemon(true);
                return t;
            });

    private final ObjectMapper objectMapper;

    public RealtimeEventBus(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        heartbeatScheduler.scheduleAtFixedRate(
                this::sendHeartbeats,
                HEARTBEAT_INTERVAL_SECONDS,
                HEARTBEAT_INTERVAL_SECONDS,
                TimeUnit.SECONDS);
    }

    public SseEmitter subscribe(String tenantId, SseEmitter emitter) {
        registry.computeIfAbsent(
                        tenantId,
                        k -> new CopyOnWriteArraySet<>())
                .add(emitter);

        emitter.onCompletion(() -> unsubscribe(tenantId, emitter));
        emitter.onTimeout(() -> unsubscribe(tenantId, emitter));
        emitter.onError(e -> unsubscribe(tenantId, emitter));

        return emitter;
    }

    public void publish(RealtimeEvent event) {
        Set<SseEmitter> subscribers = registry.get(event.tenantId());
        if (subscribers == null || subscribers.isEmpty()) {
            return;
        }

        String json;
        try {
            json = objectMapper.writeValueAsString(event);
        } catch (JacksonException e) {
            log.warn("Could not serialize realtime event", e);
            return;
        }

        for (SseEmitter emitter : subscribers) {
            try {
                emitter.send(
                        SseEmitter.event()
                                .data(json, MediaType.APPLICATION_JSON));
            } catch (IOException | IllegalStateException e) {
                unsubscribe(event.tenantId(), emitter);
                log.debug(
                        "Dropped dead SSE emitter for tenant {}",
                        event.tenantId());
            }
        }
    }

    private void unsubscribe(String tenantId, SseEmitter emitter) {
        Set<SseEmitter> subscribers = registry.get(tenantId);
        if (subscribers == null) {
            return;
        }
        subscribers.remove(emitter);
        if (subscribers.isEmpty()) {
            registry.remove(tenantId, subscribers);
        }
    }

    private void sendHeartbeats() {
        registry.forEach((tenantId, subscribers) ->
                subscribers.forEach(emitter -> {
                    try {
                        emitter.send(
                                SseEmitter.event()
                                        .comment("ping"));
                    } catch (IOException | IllegalStateException e) {
                        unsubscribe(tenantId, emitter);
                    }
                }));
    }

    @PreDestroy
    void shutdown() {
        heartbeatScheduler.shutdownNow();
    }
}