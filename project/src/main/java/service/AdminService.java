package service;

import dto.AdminInvoiceResponse;
import dto.AdminQuotaUpdateRequest;
import dto.AdminTenantCreateRequest;
import dto.AdminTenantDetailResponse;
import dto.AdminTenantResponse;
import dto.AdminTenantStatusRequest;
import dto.AdminTenantUpdateRequest;
import dto.AdminUsageEventResponse;
import dto.ApiKeyResponse;
import dto.InvoiceReportResponse;
import dto.PlatformPricingResponse;
import dto.QuotaConfigSnapshot;
import dto.PricingUpdateRequest;
import dto.QuotaSummarySnapshot;
import dto.UsageReportResponse;
import org.springframework.http.HttpStatus;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.crypto.password.PasswordEncoder;
import persistence.entity.AppUser;
import persistence.entity.PlatformPricing;
import persistence.entity.Tenant;
import persistence.entity.TenantInvoice;
import persistence.repository.AdminUsageEventRepository;
import persistence.repository.AppUserRepository;
import persistence.repository.TenantInvoiceRepository;
import persistence.repository.PlatformPricingRepository;
import persistence.repository.TenantRepository;
import processing.service.QuotaClient;
import processing.billing.InvoiceService;
import processing.billing.InvoiceVerificationEvent;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.time.LocalDate;

@Service
public class AdminService {

    private final PlatformPricingRepository pricingRepository;
    private final TenantRepository tenantRepository;
    private final QuotaClient quotaClient;
    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApiKeyManagementService apiKeyService;
    private final TenantReportingService reportingService;
    private final TenantInvoiceRepository invoiceRepository;
    private final InvoiceService invoiceService;
    private final AdminUsageEventRepository usageEventRepository;
    private final ApplicationEventPublisher eventPublisher;

    public AdminService(
            PlatformPricingRepository pricingRepository,
            TenantRepository tenantRepository,
            QuotaClient quotaClient,
            AppUserRepository userRepository,
            PasswordEncoder passwordEncoder,
            ApiKeyManagementService apiKeyService,
            TenantReportingService reportingService,
            TenantInvoiceRepository invoiceRepository,
            InvoiceService invoiceService,
            AdminUsageEventRepository usageEventRepository,
            ApplicationEventPublisher eventPublisher) {

        this.pricingRepository = pricingRepository;
        this.tenantRepository = tenantRepository;
        this.quotaClient = quotaClient;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.apiKeyService = apiKeyService;
        this.reportingService = reportingService;
        this.invoiceRepository = invoiceRepository;
        this.invoiceService = invoiceService;
        this.usageEventRepository = usageEventRepository;
        this.eventPublisher = eventPublisher;
    }

    public PlatformPricingResponse getPricing() {

        return pricingRepository.findById(1)
                .map(pricing ->
                        new PlatformPricingResponse(
                                pricing.getId().intValue(),
                                pricing.getPricePer1kTokens(),
                                pricing.getPricePer1kApiCalls(),
                                pricing.getUpdatedAt()))
                .orElse(PlatformPricingResponse.defaults());
    }

    @Transactional
    public PlatformPricingResponse updatePricing(PricingUpdateRequest request) {

        PlatformPricing pricing =
                pricingRepository.findById(1)
                        .orElseGet(() -> {
                            PlatformPricing created = new PlatformPricing();
                            created.setId((short) 1);
                            return created;
                        });

        pricing.setPricePer1kTokens(request.pricePer1kTokens());
        pricing.setPricePer1kApiCalls(request.pricePer1kApiCalls());
        pricing.setUpdatedAt(Instant.now());

        PlatformPricing saved = pricingRepository.save(pricing);

        return new PlatformPricingResponse(
                saved.getId().intValue(),
                saved.getPricePer1kTokens(),
                saved.getPricePer1kApiCalls(),
                saved.getUpdatedAt());
    }

    public List<AdminTenantResponse> listTenants() {

        return tenantRepository.findAll()
                .stream()
                .map(tenant -> {
                    QuotaSummarySnapshot snapshot =
                            quotaClient.getUsageSummary(tenant.getTenantId());
                    return AdminTenantResponse.from(tenant, snapshot);
                })
                .sorted(Comparator.comparing(AdminTenantResponse::tenantId))
                .toList();
    }

    @Transactional
    public ApiKeyResponse createTenant(AdminTenantCreateRequest request) {
        if (tenantRepository.existsById(request.tenantId())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Tenant ID already exists");
        }
        if (userRepository.findByUsername(request.adminUsername()).isPresent()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Admin username already exists");
        }

        Tenant tenant = new Tenant();
        tenant.setTenantId(request.tenantId());
        tenant.setTenantName(request.tenantName());
        tenant.setContactEmail(request.contactEmail());
        tenant.setStatus("ACTIVE");
        tenant.setCreatedAt(Instant.now());
        tenantRepository.saveAndFlush(tenant);

        quotaClient.updateConfig(
                tenant.getTenantId(),
                new AdminQuotaUpdateRequest(
                        request.planName(),
                        request.monthlyUnitLimit(),
                        request.hardCapEnabled(),
                        request.alertThresholdPercent(),
                        request.unitRateDollars()));

        AppUser admin = new AppUser();
        admin.setTenantId(tenant.getTenantId());
        admin.setUsername(request.adminUsername());
        admin.setPasswordHash(passwordEncoder.encode(request.adminPassword()));
        admin.setEmail(request.contactEmail());
        admin.setRole("TENANT_ADMIN");
        admin.setEnabled(true);
        admin.setCreatedAt(Instant.now());
        userRepository.save(admin);

        return apiKeyService.create(tenant.getTenantId(), "Admin-created tenant key");
    }

    @Transactional
    public AdminTenantResponse updateTenantStatus(
            String tenantId,
            AdminTenantStatusRequest request) {

        Tenant tenant = findTenant(tenantId);
        tenant.setStatus(request.status());
        tenantRepository.save(tenant);
        return AdminTenantResponse.from(
                tenant,
                quotaClient.getUsageSummary(tenantId));
    }

    @Transactional
    public AdminTenantResponse updateTenant(
            String tenantId,
            AdminTenantUpdateRequest request) {

        Tenant tenant = findTenant(tenantId);
        tenant.setTenantName(request.tenantName());
        tenant.setContactEmail(request.contactEmail());
        tenantRepository.save(tenant);
        return AdminTenantResponse.from(
                tenant,
                quotaClient.getUsageSummary(tenantId));
    }

    public AdminTenantResponse updateTenantQuota(
            String tenantId,
            AdminQuotaUpdateRequest request) {

        Tenant tenant = findTenant(tenantId);
        quotaClient.updateConfig(tenantId, request);
        return AdminTenantResponse.from(
                tenant,
                quotaClient.getUsageSummary(tenantId));
    }

    public void resetTenantQuotaUsage(String tenantId) {
        findTenant(tenantId);
        quotaClient.resetCurrentMonthUsage(tenantId);
    }

    public AdminTenantDetailResponse getTenant(String tenantId) {
        Tenant tenant = findTenant(tenantId);
        UsageReportResponse usage = reportingService.getUsage(tenantId, "30d");
        QuotaSummarySnapshot quota = quotaClient.getUsageSummary(tenantId);
        QuotaConfigSnapshot quotaConfig = quotaClient.getConfig(tenantId);
        List<InvoiceReportResponse> invoices = reportingService.getInvoices(tenantId);
        List<ApiKeyResponse> keys = apiKeyService.list(tenantId);
        return new AdminTenantDetailResponse(
                AdminTenantResponse.from(tenant, quota),
                usage,
                quota,
                quotaConfig,
                invoices,
                keys);
    }

    public List<AdminInvoiceResponse> listInvoices(
            String tenantId,
            String paymentStatus) {

        String normalizedStatus = paymentStatus == null || paymentStatus.isBlank()
                ? null
                : paymentStatus.toUpperCase(Locale.ROOT);
        if (normalizedStatus != null
                && !List.of("PENDING", "PAYMENT_SUBMITTED", "PAID", "FAILED").contains(normalizedStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported invoice payment status");
        }

        return invoiceRepository.findAll().stream()
                .filter(invoice -> tenantId == null || tenantId.isBlank()
                        || tenantId.equals(invoice.getTenantId()))
                .filter(invoice -> normalizedStatus == null
                        || normalizedStatus.equalsIgnoreCase(invoice.getPaymentStatus()))
                .sorted(Comparator.comparing(TenantInvoice::getCreatedAt).reversed())
                .map(invoice -> new AdminInvoiceResponse(
                        invoice.getInvoiceId(),
                        invoice.getTenantId(),
                        tenantRepository.findById(invoice.getTenantId())
                                .map(Tenant::getTenantName)
                                .orElse("Unknown tenant"),
                        invoice.getBillingPeriodStart(),
                        invoice.getBillingPeriodEnd(),
                        invoice.getTotalUnitsConsumed(),
                        invoice.getTotalAmountBilled(),
                        invoice.getPaymentStatus(),
                        invoice.getPaymentSubmittedAt(),
                        invoice.getCreatedAt()))
                .toList();
    }

    @Transactional
    public AdminInvoiceResponse updateInvoiceStatus(
            UUID invoiceId,
            String paymentStatus) {

        String normalizedStatus = paymentStatus.toUpperCase(Locale.ROOT);
        if (!List.of("PENDING", "PAYMENT_SUBMITTED", "PAID", "FAILED").contains(normalizedStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported invoice payment status");
        }
        TenantInvoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Invoice not found"));
        String previousStatus = invoice.getPaymentStatus();
        invoice.setPaymentStatus(normalizedStatus);
        TenantInvoice saved = invoiceRepository.save(invoice);
        if (!normalizedStatus.equals(previousStatus)
                && List.of("PAID", "FAILED").contains(normalizedStatus)) {
            tenantRepository.findById(saved.getTenantId()).ifPresent(tenant ->
                    eventPublisher.publishEvent(new InvoiceVerificationEvent(
                            saved.getInvoiceId(),
                            tenant.getTenantId(),
                            tenant.getTenantName(),
                            tenant.getContactEmail(),
                            saved.getTotalAmountBilled(),
                            normalizedStatus)));
        }
        return new AdminInvoiceResponse(
                saved.getInvoiceId(),
                saved.getTenantId(),
                tenantRepository.findById(saved.getTenantId())
                        .map(Tenant::getTenantName)
                        .orElse("Unknown tenant"),
                saved.getBillingPeriodStart(),
                saved.getBillingPeriodEnd(),
                saved.getTotalUnitsConsumed(),
                saved.getTotalAmountBilled(),
                saved.getPaymentStatus(),
                saved.getPaymentSubmittedAt(),
                saved.getCreatedAt());
    }

    public AdminInvoiceResponse generateInvoice(
            String tenantId,
            LocalDate periodStart,
            LocalDate periodEnd) {

        Tenant tenant = findTenant(tenantId);
        TenantInvoice invoice = invoiceService.generateInvoice(
                tenantId,
                periodStart,
                periodEnd);
        return new AdminInvoiceResponse(
                invoice.getInvoiceId(),
                tenant.getTenantId(),
                tenant.getTenantName(),
                invoice.getBillingPeriodStart(),
                invoice.getBillingPeriodEnd(),
                invoice.getTotalUnitsConsumed(),
                invoice.getTotalAmountBilled(),
                invoice.getPaymentStatus(),
                invoice.getPaymentSubmittedAt(),
                invoice.getCreatedAt());
    }

    public List<AdminUsageEventResponse> searchUsageEvents(
            String tenantId,
            String metricName,
            Instant from,
            Instant to,
            int limit) {

        if (from != null && to != null && from.isAfter(to)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "'from' must not be after 'to'");
        }
        return usageEventRepository.search(
                tenantId,
                metricName,
                from,
                to,
                Math.max(1, Math.min(limit, 500)));
    }

    public List<ApiKeyResponse> listTenantApiKeys(String tenantId) {
        findTenant(tenantId);
        return apiKeyService.list(tenantId);
    }

    public ApiKeyResponse createTenantApiKey(String tenantId, String label) {
        findTenant(tenantId);
        return apiKeyService.create(tenantId, label);
    }

    public void revokeTenantApiKey(String tenantId, UUID keyId) {
        findTenant(tenantId);
        apiKeyService.revoke(tenantId, keyId);
    }

    private Tenant findTenant(String tenantId) {
        return tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Tenant not found: " + tenantId));
    }
}