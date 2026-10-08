package processing.billing;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.text.NumberFormat;
import java.util.Locale;

@Component
public class PaymentEmailNotificationListener {

    private static final Logger log =
            LoggerFactory.getLogger(PaymentEmailNotificationListener.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String adminAddress;

    public PaymentEmailNotificationListener(
            JavaMailSender mailSender,
            @Value("${app.mail.from:}") String fromAddress,
            @Value("${app.mail.payment-admin:}") String adminAddress) {

        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.adminAddress = adminAddress;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPaymentSubmitted(PaymentSubmittedEvent event) {
        if (adminAddress.isBlank()) {
            log.warn(
                    "Payment alert not sent for invoice {}: payment admin email is not configured",
                    event.invoiceId());
            return;
        }

        String subject = "Payment reported for invoice " + event.invoiceId();
        String body = """
                A tenant reported a manual payment.

                Tenant: %s (%s)
                Tenant contact: %s
                Invoice: %s
                Amount: %s
                Submitted at: %s

                Verify receipt in your payment account before marking the invoice as paid.
                """.formatted(
                event.tenantName(),
                event.tenantId(),
                display(event.tenantEmail()),
                event.invoiceId(),
                formatInr(event.amount()),
                event.submittedAt());
        send(event.invoiceId().toString(), adminAddress, subject, body);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onInvoiceVerified(InvoiceVerificationEvent event) {
        if (event.tenantEmail() == null || event.tenantEmail().isBlank()) {
            log.warn(
                    "Invoice verification email not sent for invoice {}: tenant {} has no contact email",
                    event.invoiceId(),
                    event.tenantId());
            return;
        }

        String outcome = "PAID".equals(event.paymentStatus())
                ? "confirmed as paid"
                : "not verified";
        String subject = "Payment update for TokenMeter invoice " + event.invoiceId();
        String body = """
                Hello %s,

                Your payment report for invoice %s (%s) was reviewed.
                Amount: %s
                Result: %s

                If you believe this result is incorrect, contact your TokenMeter administrator.
                """.formatted(
                display(event.tenantName()),
                event.invoiceId(),
                event.tenantId(),
                formatInr(event.amount()),
                outcome);
        send(event.invoiceId().toString(), event.tenantEmail(), subject, body);
    }

    private void send(
            String invoiceId,
            String recipient,
            String subject,
            String body) {

        if (fromAddress.isBlank()) {
            log.warn(
                    "Payment notification not sent for invoice {}: MAIL_FROM or MAIL_USERNAME is not configured",
                    invoiceId);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(recipient);
        message.setSubject(subject);
        message.setText(body);
        try {
            mailSender.send(message);
        } catch (MailException exception) {
            log.error(
                    "Failed to send payment notification for invoice {} to {}",
                    invoiceId,
                    recipient,
                    exception);
        }
    }

    private String formatInr(java.math.BigDecimal amount) {
        return NumberFormat.getCurrencyInstance(Locale.forLanguageTag("en-IN"))
                .format(amount);
    }

    private String display(String value) {
        return value == null || value.isBlank() ? "not provided" : value;
    }
}
