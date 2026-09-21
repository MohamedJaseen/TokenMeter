package service;

import dto.UsageEventDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.UUID;

@Service
public class UsageReportingService {

    private final RestClient restClient;

    public UsageReportingService(
            @Value("${metering.ingestion-url}") String ingestionUrl) {

        this.restClient = RestClient.builder()
                .baseUrl(ingestionUrl)
                .build();
    }

    public void report(String tenantId, long totalTokens) {

        UsageEventDto event = new UsageEventDto(
                UUID.randomUUID(),
                tenantId,
                "llm_tokens",
                totalTokens,
                Instant.now()
        );

        restClient.post()
                .uri("")
                .contentType(MediaType.APPLICATION_JSON)
                .body(event)
                .retrieve()
                .toBodilessEntity();
    }
}