package processing.service;

import dto.RealtimeEvent;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RealtimeEventBusTest {

    private RealtimeEventBus eventBus;

    @BeforeEach
    void setUp() throws Exception {
        ObjectMapper objectMapper = mock(ObjectMapper.class);
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        eventBus = new RealtimeEventBus(objectMapper);
    }

    @AfterEach
    void tearDown() {
        eventBus.shutdown();
    }

    @Test
    void newSubscriberReceivesRecentUsageEvents() throws Exception {
        RealtimeEvent usageEvent = new RealtimeEvent(
                RealtimeEvent.TYPE_USAGE,
                UUID.randomUUID().toString(),
                "tenantA",
                "llm_tokens",
                42L,
                Instant.now());
        SseEmitter originalSubscriber = mock(SseEmitter.class);
        SseEmitter lateSubscriber = mock(SseEmitter.class);

        eventBus.subscribe("tenantA", originalSubscriber);
        eventBus.publish(usageEvent);
        eventBus.subscribe("tenantA", lateSubscriber);

        verify(originalSubscriber, times(1))
                .send(any(SseEmitter.SseEventBuilder.class));
        verify(lateSubscriber, times(1))
                .send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    void connectionNotificationsAreNotReplayedAsUsageEvents()
            throws Exception {

        eventBus.publish(RealtimeEvent.connected("tenantA"));
        SseEmitter subscriber = mock(SseEmitter.class);

        eventBus.subscribe("tenantA", subscriber);

        verify(subscriber, times(0))
                .send(any(SseEmitter.SseEventBuilder.class));
    }
}
