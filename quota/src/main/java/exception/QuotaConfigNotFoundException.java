package exception;

public class QuotaConfigNotFoundException extends RuntimeException {

    public QuotaConfigNotFoundException(String tenantId) {
        super("Quota configuration not found for tenant: " + tenantId);
    }
}