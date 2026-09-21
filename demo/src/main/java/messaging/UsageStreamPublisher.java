package messaging;

import domain.UsageEvent;

public interface UsageStreamPublisher {

    void publish(UsageEvent event);
}
