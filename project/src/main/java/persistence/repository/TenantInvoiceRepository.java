package persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import persistence.entity.TenantInvoice;
import jakarta.persistence.LockModeType;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TenantInvoiceRepository
        extends JpaRepository<TenantInvoice, UUID> {

    List<TenantInvoice> findByTenantIdOrderByCreatedAtDesc(
            String tenantId);

    Optional<TenantInvoice> findByTenantIdAndBillingPeriodStartAndBillingPeriodEnd(
            String tenantId,
            LocalDate billingPeriodStart,
            LocalDate billingPeriodEnd);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<TenantInvoice> findByInvoiceIdAndTenantId(
            UUID invoiceId,
            String tenantId);
}