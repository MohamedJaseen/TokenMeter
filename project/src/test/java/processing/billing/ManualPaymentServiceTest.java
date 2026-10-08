package processing.billing;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import persistence.entity.TenantInvoice;
import persistence.repository.TenantInvoiceRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ManualPaymentServiceTest {

    private static final UUID INVOICE_ID =
            UUID.fromString("11111111-1111-4111-8111-111111111111");

    private TenantInvoiceRepository invoiceRepository;
    private ManualPaymentService paymentService;
    private TenantInvoice invoice;

    @BeforeEach
    void setUp() {
        invoiceRepository = mock(TenantInvoiceRepository.class);
        PaymentProvider paymentProvider = new ManualQrPaymentProvider(
                "https://payments.example.test/merchant-qr.png");
        paymentService = new ManualPaymentService(
                invoiceRepository,
                paymentProvider);
        invoice = new TenantInvoice();
        invoice.setInvoiceId(INVOICE_ID);
        invoice.setTenantId("tenant_test");
        invoice.setTotalAmountBilled(new BigDecimal("12.50"));
        invoice.setPaymentStatus("PENDING");
        when(invoiceRepository.findByInvoiceIdAndTenantId(INVOICE_ID, "tenant_test"))
                .thenReturn(Optional.of(invoice));
        when(invoiceRepository.findForUpdateByInvoiceIdAndTenantId(INVOICE_ID, "tenant_test"))
                .thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(invoice)).thenReturn(invoice);
    }

    @Test
    void paymentDetailsReturnConfiguredQrAndInrAmount() {
        var details = paymentService.getPaymentDetails("tenant_test", INVOICE_ID);

        assertThat(details.amount()).isEqualByComparingTo("12.50");
        assertThat(details.currency()).isEqualTo("INR");
        assertThat(details.qrImageUrl())
                .isEqualTo("https://payments.example.test/merchant-qr.png");
        assertThat(details.paymentStatus()).isEqualTo("PENDING");
        verify(invoiceRepository).findByInvoiceIdAndTenantId(INVOICE_ID, "tenant_test");
    }

    @Test
    void paymentSubmissionFlagsInvoiceButDoesNotMarkItPaid() {
        TenantInvoice saved = paymentService.submitPayment("tenant_test", INVOICE_ID);

        assertThat(saved.getPaymentStatus()).isEqualTo("PAYMENT_SUBMITTED");
        assertThat(saved.getPaymentSubmittedAt()).isNotNull()
                .isBeforeOrEqualTo(Instant.now());
        verify(invoiceRepository)
                .findForUpdateByInvoiceIdAndTenantId(INVOICE_ID, "tenant_test");
        verify(invoiceRepository).save(invoice);
    }

    @Test
    void refusesPaymentDetailsWhenQrImageIsNotSecurelyConfigured() {
        ManualPaymentService serviceWithoutQr =
                new ManualPaymentService(
                        invoiceRepository,
                        new ManualQrPaymentProvider(""));

        assertThatThrownBy(() ->
                serviceWithoutQr.getPaymentDetails("tenant_test", INVOICE_ID))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("secure manual payment QR image URL");
    }
}
