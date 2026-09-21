package service;

import dto.AdminTenantResponse;
import dto.PlatformPricingResponse;
import dto.PricingUpdateRequest;
import dto.QuotaSummarySnapshot;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import persistence.entity.PlatformPricing;
import persistence.entity.Tenant;
import persistence.repository.PlatformPricingRepository;
import persistence.repository.TenantRepository;
import processing.service.QuotaClient;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@Service
public class AdminService {

    private final PlatformPricingRepository pricingRepository;
    private final TenantRepository tenantRepository;
    private final QuotaClient quotaClient;

    public AdminService(
            PlatformPricingRepository pricingRepository,
            TenantRepository tenantRepository,
            QuotaClient quotaClient) {

        this.pricingRepository = pricingRepository;
        this.tenantRepository = tenantRepository;
        this.quotaClient = quotaClient;
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
                .map(Tenant::getTenantId)
                .map(tenantId -> {
                    QuotaSummarySnapshot snapshot =
                            quotaClient.getUsageSummary(tenantId);
                    return AdminTenantResponse.from(snapshot);
                })
                .sorted(Comparator.comparing(AdminTenantResponse::tenantId))
                .toList();
    }
}