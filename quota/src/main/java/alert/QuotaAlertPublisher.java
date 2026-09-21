package alert;

public interface QuotaAlertPublisher {

    void publish(QuotaAlertEvent event);
}