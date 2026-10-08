package persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    Optional<TenantInvoice> findByInvoiceIdAndTenantId(
            UUID invoiceId,
            String tenantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select invoice
            from TenantInvoice invoice
            where invoice.invoiceId = :invoiceId
              and invoice.tenantId = :tenantId
            """)
    Optional<TenantInvoice> findForUpdateByInvoiceIdAndTenantId(
            @Param("invoiceId") UUID invoiceId,
            @Param("tenantId") String tenantId);
}