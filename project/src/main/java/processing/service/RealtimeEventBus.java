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
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
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
    private static final int RECENT_USAGE_EVENT_LIMIT = 200;

    private final ConcurrentHashMap<String, Set<SseEmitter>> registry =
            new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Deque<RealtimeEvent>> recentEvents =
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
        Set<SseEmitter> subscribers =
                registry.computeIfAbsent(
                        tenantId,
                        k -> new CopyOnWriteArraySet<>());
        Deque<RealtimeEvent> history =
                recentEvents.computeIfAbsent(
                        tenantId,
                        k -> new ArrayDeque<>());

        synchronized (history) {
            for (RealtimeEvent event : history) {
                if (!sendToEmitter(tenantId, emitter, event)) {
                    return emitter;
                }
            }
            subscribers.add(emitter);
        }

        emitter.onCompletion(() -> unsubscribe(tenantId, emitter));
        emitter.onTimeout(() -> unsubscribe(tenantId, emitter));
        emitter.onError(e -> unsubscribe(tenantId, emitter));

        return emitter;
    }

    public void publish(RealtimeEvent event) {
        Deque<RealtimeEvent> history =
                recentEvents.computeIfAbsent(
                        event.tenantId(),
                        k -> new ArrayDeque<>());

        List<SseEmitter> subscribers;
        synchronized (history) {
            if (RealtimeEvent.TYPE_USAGE.equals(event.type())) {
                history.addLast(event);
                while (history.size() > RECENT_USAGE_EVENT_LIMIT) {
                    history.removeFirst();
                }
            }

            Set<SseEmitter> registered = registry.get(event.tenantId());
            subscribers = registered == null
                    ? List.of()
                    : new ArrayList<>(registered);
        }

        for (SseEmitter emitter : subscribers) {
            sendToEmitter(event.tenantId(), emitter, event);
        }
    }

    private boolean sendToEmitter(
            String tenantId,
            SseEmitter emitter,
            RealtimeEvent event) {

        try {
            String json = objectMapper.writeValueAsString(event);
            emitter.send(
                    SseEmitter.event()
                            .data(json, MediaType.APPLICATION_JSON));
            return true;
        } catch (JacksonException e) {
            log.warn("Could not serialize realtime event", e);
            return false;
        } catch (IOException | IllegalStateException e) {
            unsubscribe(tenantId, emitter);
            log.debug(
                    "Dropped dead SSE emitter for tenant {}",
                    tenantId);
            return false;
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