package controller;

import dto.UsageEventRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import service.IngestionResult;
import service.UsageIngestionService;

@RestController
@RequestMapping("/metering")
public class MeteringIngressController {

    private final UsageIngestionService usageIngestionService;

    public MeteringIngressController(UsageIngestionService usageIngestionService) {
        this.usageIngestionService = usageIngestionService;
    }

    @PostMapping("/usage")
    public ResponseEntity<IngestionResult> ingest(@Valid @RequestBody UsageEventRequest request) {

        IngestionResult result = usageIngestionService.ingest(request);

        return ResponseEntity
                .status(HttpStatus.ACCEPTED)
                .body(result);
    }
}
