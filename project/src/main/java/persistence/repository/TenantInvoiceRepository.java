package persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import persistence.entity.TenantInvoice;

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
}