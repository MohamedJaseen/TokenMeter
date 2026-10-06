package processing.billing;

import dto.PaymentInstructions;
import persistence.entity.TenantInvoice;

public interface PaymentProvider {

    PaymentInstructions getPaymentInstructions(TenantInvoice invoice);

    void validateConfigured();
}
