package controller;

import dto.AdminTenantResponse;
import dto.PlatformPricingResponse;
import dto.PricingUpdateRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import service.AdminService;

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
}