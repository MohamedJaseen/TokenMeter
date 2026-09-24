package controller;

import dto.AiGenerateRequest;
import dto.AiGenerateResponse;
import dto.NormalizedAiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import security.TenantPrincipal;
import service.AiProviderRouter;
import service.UsageReportingService;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ai")
public class AiProxyController {

    private final AiProviderRouter providerRouter;
    private final UsageReportingService usageReportingService;

    public AiProxyController(
            AiProviderRouter providerRouter,
            UsageReportingService usageReportingService) {

        this.providerRouter = providerRouter;
        this.usageReportingService = usageReportingService;
    }

    @PostMapping("/generate")
    public ResponseEntity<AiGenerateResponse> generate(
            @Valid @RequestBody
            AiGenerateRequest request) {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        TenantPrincipal principal =
                (TenantPrincipal) authentication.getPrincipal();

        String tenantId = principal.tenantId();

        NormalizedAiResponse response = providerRouter.generate(request.provider(), request.prompt(), request.model());
        long inputTokens = response.usage().inputTokens();
        long outputTokens = response.usage().outputTokens();
        long totalTokens = response.usage().totalTokens();

        usageReportingService.report(tenantId, totalTokens);

        return ResponseEntity.ok(new AiGenerateResponse(
                response.provider().toLowerCase() + "-" + UUID.randomUUID(),
                response.model(),
                tenantId,
                response.text(),
                inputTokens,
                outputTokens,
                totalTokens
        ));
    }

}