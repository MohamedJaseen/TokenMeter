package service;

import domain.UsageEvent;
import dto.UsageEventRequest;
import messaging.UsageStreamPublisher;
import org.springframework.stereotype.Service;
import repository.IdempotencyRepository;

import java.time.Duration;

@Service
public class UsageIngestionService {

    private static final Duration IDEMPOTENCY_TTL =
            Duration.ofHours(24);

    private final UsageStreamPublisher streamPublisher;
    private final IdempotencyRepository idempotencyRepository;

    public UsageIngestionService(
            UsageStreamPublisher streamPublisher,
            IdempotencyRepository idempotencyRepository) {

        this.streamPublisher = streamPublisher;
        this.idempotencyRepository = idempotencyRepository;
    }

    public IngestionResult ingest(UsageEventRequest request) {

        UsageEvent event = new UsageEvent(
                request.eventId(),
                request.tenantId(),
                request.metricName(),
                request.units(),
                request.timestamp()
        );

        boolean isNew = idempotencyRepository.tryMarkAsProcessed(
                event.tenantId(),
                event.eventId(),
                IDEMPOTENCY_TTL
        );

        if (!isNew) {
            return IngestionResult.duplicate(event.eventId());
        }

        streamPublisher.publish(event);

        return IngestionResult.queued(event.eventId());
    }
}
