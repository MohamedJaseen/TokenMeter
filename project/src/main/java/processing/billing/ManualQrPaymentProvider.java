package processing.billing;

import dto.PaymentInstructions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import persistence.entity.TenantInvoice;

@Component
public class ManualQrPaymentProvider implements PaymentProvider {

    private final String qrImageUrl;

    public ManualQrPaymentProvider(
            @Value("${payment.manual.qr-image-url:}") String qrImageUrl) {

        this.qrImageUrl = qrImageUrl;
    }

    @Override
    public PaymentInstructions getPaymentInstructions(TenantInvoice invoice) {
        validateConfigured();
        return new PaymentInstructions(
                invoice.getInvoiceId(),
                invoice.getTotalAmountBilled(),
                "INR",
                qrImageUrl,
                invoice.getPaymentStatus());
    }

    @Override
    public void validateConfigured() {
        if (qrImageUrl.isBlank() || !qrImageUrl.startsWith("https://")) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "A secure manual payment QR image URL is not configured");
        }
    }

}
