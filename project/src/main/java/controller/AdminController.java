package controller;

import dto.AdminInvoiceResponse;
import dto.AdminGenerateInvoiceRequest;
import dto.AdminInvoiceStatusRequest;
import dto.AdminQuotaUpdateRequest;
import dto.AdminTenantCreateRequest;
import dto.AdminTenantDetailResponse;
import dto.AdminTenantResponse;
import dto.AdminTenantStatusRequest;
import dto.AdminTenantUpdateRequest;
import dto.AdminUsageEventResponse;
import dto.ApiKeyCreateRequest;
import dto.ApiKeyResponse;
import dto.PlatformPricingResponse;
import dto.PricingUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import service.AdminService;

import java.time.Instant;
import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/pricing")
    public PlatformPricingResponse getPricing() {
        return adminService.getPricing();
    }

    @PutMapping("/pricing")
    public PlatformPricingResponse updatePricing(
            @Valid @RequestBody PricingUpdateRequest request) {

        return adminService.updatePricing(request);
    }

    @GetMapping("/tenants")
    public List<AdminTenantResponse> listTenants() {
        return adminService.listTenants();
    }

    @PostMapping("/tenants")
    public ResponseEntity<ApiKeyResponse> createTenant(
            @Valid @RequestBody AdminTenantCreateRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminService.createTenant(request));
    }

    @GetMapping("/tenants/{tenantId}")
    public AdminTenantDetailResponse getTenant(
            @PathVariable String tenantId) {

        return adminService.getTenant(tenantId);
    }

    @PatchMapping("/tenants/{tenantId}")
    public AdminTenantResponse updateTenant(
            @PathVariable String tenantId,
            @Valid @RequestBody AdminTenantUpdateRequest request) {

        return adminService.updateTenant(tenantId, request);
    }

    @PatchMapping("/tenants/{tenantId}/status")
    public AdminTenantResponse updateTenantStatus(
            @PathVariable String tenantId,
            @Valid @RequestBody AdminTenantStatusRequest request) {

        return adminService.updateTenantStatus(tenantId, request);
    }

    @PutMapping("/tenants/{tenantId}/quota")
    public AdminTenantResponse updateTenantQuota(
            @PathVariable String tenantId,
            @Valid @RequestBody AdminQuotaUpdateRequest request) {

        return adminService.updateTenantQuota(tenantId, request);
    }

    @PostMapping("/tenants/{tenantId}/quota/reset")
    public ResponseEntity<Void> resetTenantQuotaUsage(
            @PathVariable String tenantId) {

        adminService.resetTenantQuotaUsage(tenantId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/tenants/{tenantId}/api-keys")
    public List<ApiKeyResponse> listTenantApiKeys(
            @PathVariable String tenantId) {

        return adminService.listTenantApiKeys(tenantId);
    }

    @PostMapping("/tenants/{tenantId}/api-keys")
    public ResponseEntity<ApiKeyResponse> createTenantApiKey(
            @PathVariable String tenantId,
            @RequestBody ApiKeyCreateRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(adminService.createTenantApiKey(tenantId, request.label()));
    }

    @DeleteMapping("/tenants/{tenantId}/api-keys/{keyId}")
    public ResponseEntity<Void> revokeTenantApiKey(
            @PathVariable String tenantId,
            @PathVariable UUID keyId) {

        adminService.revokeTenantApiKey(tenantId, keyId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/invoices")
    public List<AdminInvoiceResponse> listInvoices(
            @RequestParam(required = false) String tenantId,
            @RequestParam(required = false) String paymentStatus) {

        return adminService.listInvoices(tenantId, paymentStatus);
    }

    @PostMapping("/invoices")
    public AdminInvoiceResponse generateInvoice(
            @Valid @RequestBody AdminGenerateInvoiceRequest request) {

        return adminService.generateInvoice(
                request.tenantId(),
                request.periodStart(),
                request.periodEnd());
    }

    @PatchMapping("/invoices/{invoiceId}/status")
    public AdminInvoiceResponse updateInvoiceStatus(
            @PathVariable UUID invoiceId,
            @Valid @RequestBody AdminInvoiceStatusRequest request) {

        return adminService.updateInvoiceStatus(
                invoiceId,
                request.paymentStatus());
    }

    @GetMapping("/usage-events")
    public List<AdminUsageEventResponse> searchUsageEvents(
            @RequestParam(required = false) String tenantId,
            @RequestParam(required = false) String metricName,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "100") int limit) {

        return adminService.searchUsageEvents(
                tenantId,
                metricName,
                from,
                to,
                limit);
    }

}