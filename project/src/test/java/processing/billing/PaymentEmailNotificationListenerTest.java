package processing.billing;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class PaymentEmailNotificationListenerTest {

    private final JavaMailSender mailSender = mock(JavaMailSender.class);
    private final PaymentEmailNotificationListener listener =
            new PaymentEmailNotificationListener(
                    mailSender,
                    "billing@example.test",
                    "jaseen132219@gmail.com");

    @Test
    void paymentSubmissionAlertsConfiguredAdminRecipient() {
        UUID invoiceId = UUID.randomUUID();

        listener.onPaymentSubmitted(new PaymentSubmittedEvent(
                invoiceId,
                "tenant-a",
                "Tenant A",
                "tenant@example.test",
                new BigDecimal("12.50"),
                Instant.parse("2026-10-08T00:00:00Z")));

        var message = forClass(SimpleMailMessage.class);
        verify(mailSender).send(message.capture());
        assertThat(message.getValue().getTo())
                .containsExactly("jaseen132219@gmail.com");
        assertThat(message.getValue().getSubject())
                .contains(invoiceId.toString());
        assertThat(message.getValue().getText())
                .contains("tenant@example.test", "12.50", "Verify receipt");
    }

    @Test
    void verifiedPaymentNotifiesTenantOfPaidResult() {
        UUID invoiceId = UUID.randomUUID();

        listener.onInvoiceVerified(new InvoiceVerificationEvent(
                invoiceId,
                "tenant-a",
                "Tenant A",
                "tenant@example.test",
                new BigDecimal("12.50"),
                "PAID"));

        var message = forClass(SimpleMailMessage.class);
        verify(mailSender).send(message.capture());
        assertThat(message.getValue().getTo())
                .containsExactly("tenant@example.test");
        assertThat(message.getValue().getText())
                .contains("confirmed as paid", invoiceId.toString());
    }
}
