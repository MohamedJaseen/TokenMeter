package controller;

import dto.ApiKeyCreateRequest;
import dto.ApiKeyResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import service.ApiKeyManagementService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/api-keys")
public class TenantApiKeyController {

    private final ApiKeyManagementService apiKeyManagementService;

    public TenantApiKeyController(
            ApiKeyManagementService apiKeyManagementService) {

        this.apiKeyManagementService = apiKeyManagementService;
    }

    @GetMapping
    public List<ApiKeyResponse> listKeys(
            @PathVariable String tenantId) {

        return apiKeyManagementService.list(tenantId);
    }

    @PostMapping
    public ResponseEntity<ApiKeyResponse> createKey(
            @PathVariable String tenantId,
            @Valid @RequestBody ApiKeyCreateRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(apiKeyManagementService.create(
                        tenantId,
                        request.label()));
    }

    @DeleteMapping("/{keyId}")
    public ResponseEntity<Void> revokeKey(
            @PathVariable String tenantId,
            @PathVariable UUID keyId) {

        apiKeyManagementService.revoke(tenantId, keyId);

        return ResponseEntity.noContent().build();
    }
}