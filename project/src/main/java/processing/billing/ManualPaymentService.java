package processing.billing;

import dto.PaymentInstructions;
import java.time.Instant;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import persistence.entity.TenantInvoice;
import persistence.repository.TenantRepository;
import persistence.repository.TenantInvoiceRepository;

@Service
public class ManualPaymentService {

    private final TenantInvoiceRepository invoiceRepository;
    private final TenantRepository tenantRepository;
    private final PaymentProvider paymentProvider;
    private final ApplicationEventPublisher eventPublisher;

    public ManualPaymentService(
            TenantInvoiceRepository invoiceRepository,
            TenantRepository tenantRepository,
            PaymentProvider paymentProvider,
            ApplicationEventPublisher eventPublisher) {

        this.invoiceRepository = invoiceRepository;
        this.tenantRepository = tenantRepository;
        this.paymentProvider = paymentProvider;
        this.eventPublisher = eventPublisher;
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
        TenantInvoice invoice = invoiceRepository
                .findForUpdateByInvoiceIdAndTenantId(invoiceId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Invoice not found"));
        if ("PAYMENT_SUBMITTED".equals(invoice.getPaymentStatus())) {
            return invoice;
        }
        requirePayable(invoice);
        paymentProvider.validateConfigured();
        invoice.setPaymentStatus("PAYMENT_SUBMITTED");
        Instant submittedAt = Instant.now();
        invoice.setPaymentSubmittedAt(submittedAt);
        TenantInvoice saved = invoiceRepository.save(invoice);
        tenantRepository.findById(tenantId).ifPresentOrElse(
                tenant -> eventPublisher.publishEvent(new PaymentSubmittedEvent(
                        saved.getInvoiceId(),
                        tenant.getTenantId(),
                        tenant.getTenantName(),
                        tenant.getContactEmail(),
                        saved.getTotalAmountBilled(),
                        submittedAt)),
                () -> eventPublisher.publishEvent(new PaymentSubmittedEvent(
                        saved.getInvoiceId(),
                        tenantId,
                        "Unknown tenant",
                        null,
                        saved.getTotalAmountBilled(),
                        submittedAt)));
        return saved;
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
