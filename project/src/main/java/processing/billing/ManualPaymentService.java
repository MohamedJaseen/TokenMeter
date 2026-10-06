package processing.billing;

import dto.PaymentInstructions;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import persistence.entity.TenantInvoice;
import persistence.repository.TenantInvoiceRepository;

@Service
public class ManualPaymentService {

    private final TenantInvoiceRepository invoiceRepository;
    private final PaymentProvider paymentProvider;

    public ManualPaymentService(
            TenantInvoiceRepository invoiceRepository,
            PaymentProvider paymentProvider) {

        this.invoiceRepository = invoiceRepository;
        this.paymentProvider = paymentProvider;
    }

    @Transactional(readOnly = true)
    public PaymentInstructions getPaymentDetails(
            String tenantId,
            UUID invoiceId) {

        TenantInvoice invoice = findInvoice(tenantId, invoiceId);
        requirePayable(invoice);
        return paymentProvider.getPaymentInstructions(invoice);
    }

    @Transactional
    public TenantInvoice submitPayment(String tenantId, UUID invoiceId) {
        TenantInvoice invoice = findInvoice(tenantId, invoiceId);
        if ("PAYMENT_SUBMITTED".equals(invoice.getPaymentStatus())) {
            return invoice;
        }
        requirePayable(invoice);
        paymentProvider.validateConfigured();
        invoice.setPaymentStatus("PAYMENT_SUBMITTED");
        invoice.setPaymentSubmittedAt(Instant.now());
        return invoiceRepository.save(invoice);
    }

    private TenantInvoice findInvoice(String tenantId, UUID invoiceId) {
        return invoiceRepository.findByInvoiceIdAndTenantId(invoiceId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Invoice not found"));
    }

    private void requirePayable(TenantInvoice invoice) {
        if (invoice.getTotalAmountBilled() == null
                || invoice.getTotalAmountBilled().signum() <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This invoice has no payment due");
        }
        if (!"PENDING".equals(invoice.getPaymentStatus())
                && !"FAILED".equals(invoice.getPaymentStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "This invoice is not awaiting a payment submission");
        }
    }

}
