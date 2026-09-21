package persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "tenant_invoices")
public class TenantInvoice {

    @Id
    @GeneratedValue
    @Column(name = "invoice_id")
    private UUID invoiceId;

    @Column(name = "tenant_id", nullable = false, length = 64)
    private String tenantId;

    @Column(name = "billing_period_start", nullable = false)
    private LocalDate billingPeriodStart;

    @Column(name = "billing_period_end", nullable = false)
    private LocalDate billingPeriodEnd;

    @Column(name = "total_units_consumed", nullable = false)
    private long totalUnitsConsumed;

    @Column(name = "total_amount_billed", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmountBilled;

    @Column(name = "payment_status", nullable = false, length = 24)
    private String paymentStatus;

    @Column(name = "created_at")
    private Instant createdAt;

    public TenantInvoice() {
    }

    public UUID getInvoiceId() {
        return invoiceId;
    }

    public void setInvoiceId(UUID invoiceId) {
        this.invoiceId = invoiceId;
    }

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public LocalDate getBillingPeriodStart() {
        return billingPeriodStart;
    }

    public void setBillingPeriodStart(LocalDate billingPeriodStart) {
        this.billingPeriodStart = billingPeriodStart;
    }

    public LocalDate getBillingPeriodEnd() {
        return billingPeriodEnd;
    }

    public void setBillingPeriodEnd(LocalDate billingPeriodEnd) {
        this.billingPeriodEnd = billingPeriodEnd;
    }

    public long getTotalUnitsConsumed() {
        return totalUnitsConsumed;
    }

    public void setTotalUnitsConsumed(long totalUnitsConsumed) {
        this.totalUnitsConsumed = totalUnitsConsumed;
    }

    public BigDecimal getTotalAmountBilled() {
        return totalAmountBilled;
    }

    public void setTotalAmountBilled(BigDecimal totalAmountBilled) {
        this.totalAmountBilled = totalAmountBilled;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}