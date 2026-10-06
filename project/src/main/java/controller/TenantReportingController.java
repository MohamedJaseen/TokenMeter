package controller;

import dto.InvoiceReportResponse;
import dto.InvoiceRequest;
import dto.PaymentInstructions;
import dto.RealtimeEvent;
import dto.UsageReportResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import persistence.entity.TenantInvoice;
import persistence.repository.TenantRepository;
import processing.billing.InvoiceService;
import processing.billing.ManualPaymentService;
import processing.service.RealtimeEventBus;
import service.TenantReportingService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tenants")
public class TenantReportingController {

    private final TenantReportingService reportingService;
    private final RealtimeEventBus realtimeEventBus;
    private final TenantRepository tenantRepository;
    private final InvoiceService invoiceService;
    private final ManualPaymentService manualPaymentService;

    public TenantReportingController(
            TenantReportingService reportingService,
            RealtimeEventBus realtimeEventBus,
            TenantRepository tenantRepository,
            InvoiceService invoiceService,
            ManualPaymentService manualPaymentService) {

        this.reportingService = reportingService;
        this.realtimeEventBus = realtimeEventBus;
        this.tenantRepository = tenantRepository;
        this.invoiceService = invoiceService;
        this.manualPaymentService = manualPaymentService;
    }

    @GetMapping("/{id}/usage")
    public UsageReportResponse getUsage(
            @PathVariable("id") String tenantId,
            @RequestParam(defaultValue = "24h") String range) {

        return reportingService.getUsage(tenantId, range);
    }

    @GetMapping("/{id}/invoice")
    public List<InvoiceReportResponse> getInvoices(
            @PathVariable("id") String tenantId) {

        return reportingService.getInvoices(tenantId);
    }

    @PostMapping("/{id}/invoice")
    public InvoiceReportResponse generateInvoice(
            @PathVariable("id") String tenantId,
            @Valid @RequestBody InvoiceRequest request) {

        if (!tenantRepository.existsById(tenantId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Tenant not found: " + tenantId);
        }

        TenantInvoice invoice =
                invoiceService.generateInvoice(
                        tenantId,
                        request.periodStart(),
                        request.periodEnd());

        return toResponse(invoice);
    }

    @GetMapping("/{id}/invoice/{invoiceId}/payment-details")
    public PaymentInstructions getPaymentDetails(
            @PathVariable("id") String tenantId,
            @PathVariable java.util.UUID invoiceId) {

        return manualPaymentService.getPaymentDetails(tenantId, invoiceId);
    }

    @PostMapping("/{id}/invoice/{invoiceId}/payment-submission")
    public InvoiceReportResponse submitManualPayment(
            @PathVariable("id") String tenantId,
            @PathVariable java.util.UUID invoiceId) {

        return toResponse(manualPaymentService.submitPayment(tenantId, invoiceId));
    }

    @GetMapping(
            value = "/{id}/usage/realtime",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamRealtime(
            @PathVariable("id") String tenantId) {

        if (!tenantRepository.existsById(tenantId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Tenant not found: " + tenantId);
        }

        SseEmitter emitter = new SseEmitter(60_000L);
        realtimeEventBus.subscribe(tenantId, emitter);
        realtimeEventBus.publish(
                RealtimeEvent.connected(tenantId));

        return emitter;
    }

    private InvoiceReportResponse toResponse(TenantInvoice invoice) {
        return new InvoiceReportResponse(
                invoice.getInvoiceId(),
                invoice.getTenantId(),
                invoice.getBillingPeriodStart(),
                invoice.getBillingPeriodEnd(),
                invoice.getTotalUnitsConsumed(),
                invoice.getTotalAmountBilled(),
                invoice.getPaymentStatus(),
                invoice.getPaymentSubmittedAt(),
                invoice.getCreatedAt());
    }
}