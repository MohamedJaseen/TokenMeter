package exception;

public class ProviderNotConfiguredException extends RuntimeException {
    public ProviderNotConfiguredException(String provider) {
        super("Provider " + provider.toUpperCase() + " is not configured");
    }
}
