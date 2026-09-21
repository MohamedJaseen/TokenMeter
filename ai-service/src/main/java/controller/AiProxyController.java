package controller;

import dto.AiGenerateRequest;
import dto.AiGenerateResponse;
import dto.GeminiResponse;
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
import service.GeminiService;
import service.UsageReportingService;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ai")
public class AiProxyController {

    private final GeminiService geminiService;
    private final UsageReportingService usageReportingService;

    public AiProxyController(
            GeminiService geminiService,
            UsageReportingService usageReportingService) {

        this.geminiService = geminiService;
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

        GeminiResponse response = geminiService.generate(request.prompt());

        GeminiResponse.UsageMetadata usage = response.usageMetadata();

        if (usage == null) {
            throw new IllegalStateException(
                    "Gemini response did not contain usage metadata");
        }

        long inputTokens = usage.promptTokenCount();
        long outputTokens = usage.candidatesTokenCount();
        long totalTokens = usage.totalTokenCount();

        usageReportingService.report(tenantId, totalTokens);

        return ResponseEntity.ok(new AiGenerateResponse(
                "gemini-" + UUID.randomUUID(),
                response.modelVersion(),
                tenantId,
                extractText(response),
                inputTokens,
                outputTokens,
                totalTokens
        ));
    }

    private String extractText(GeminiResponse response) {

        if (response.candidates() == null) {
            return "";
        }

        StringBuilder text = new StringBuilder();

        for (GeminiResponse.Candidate candidate : response.candidates()) {

            if (candidate == null
                    || candidate.content() == null
                    || candidate.content().parts() == null) {
                continue;
            }

            for (GeminiResponse.Part part : candidate.content().parts()) {

                if (part != null && part.text() != null) {
                    if (text.length() > 0) {
                        text.append('\n');
                    }
                    text.append(part.text());
                }
            }
        }

        return text.toString();
    }
}