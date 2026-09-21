package service;

import alert.QuotaAlertEvent;
import alert.QuotaAlertPublisher;
import domain.QuotaEvaluationResult;
import domain.QuotaStatus;
import domain.TenantQuotaConfig;
import exception.QuotaConfigNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import dto.QuotaConfigRequest;
import dto.QuotaSummaryResponse;
import redis.QuotaCounterRepository;
import repository.TenantQuotaConfigRepository;

import java.time.Duration;
import java.time.Instant;

@Service
public class QuotaService {

    private static final Logger log =
            LoggerFactory.getLogger(QuotaService.class);

    private static final Duration ALERT_LOCK_TTL = Duration.ofDays(31);

    private final TenantQuotaConfigRepository configRepository;
    private final QuotaCounterRepository counterRepository;
    private final QuotaAlertPublisher alertPublisher;

    public QuotaService(
            TenantQuotaConfigRepository configRepository,
            QuotaCounterRepository counterRepository,
            QuotaAlertPublisher alertPublisher) {

        this.configRepository = configRepository;
        this.counterRepository = counterRepository;
        this.alertPublisher = alertPublisher;
    }

    public QuotaEvaluationResult evaluate(
            String tenantId,
            String metricName,
            long units) {

        if (units <= 0) {
            throw new IllegalArgumentException(
                    "units must be greater than 0");
        }

        return evaluate(
                tenantId,
                metricName,
                units,
                counterRepository.currentMonth());
    }

    QuotaEvaluationResult evaluate(
            String tenantId,
            String metricName,
            long units,
            String month) {

        TenantQuotaConfig config =
                loadConfig(tenantId);

        long monthlyLimit =
                config.getMonthlyUnitLimit();

        if (monthlyLimit <= 0) {
            throw new IllegalStateException(
                    "Monthly unit limit must be greater than 0 for tenant: "
                            + tenantId);
        }

        // Atomic INCRBY: use the returned value, never GET+SET.
        long currentUsage =
                counterRepository.increment(
                        tenantId,
                        month,
                        units);

        double usagePercentage =
                ((double) currentUsage / monthlyLimit) * 100.0;

        boolean hardCapEnabled =
                config.isHardCapEnabled();

        QuotaStatus status =
                resolveStatus(
                        currentUsage,
                        monthlyLimit,
                        usagePercentage,
                        hardCapEnabled,
                        config.getAlertThresholdPercent());

        notifyThresholds(
                tenantId,
                month,
                config.getAlertThresholdPercent(),
                hardCapEnabled,
                currentUsage,
                monthlyLimit,
                hardCapEnabled && currentUsage >= monthlyLimit,
                usagePercentage);

        log.info(
                "Quota evaluated for tenant {} | metric={} | usage={} / "
                        + "limit={} ({}%) | status={}",
                tenantId,
                metricName,
                currentUsage,
                monthlyLimit,
                round(usagePercentage),
                status);

        if (status == QuotaStatus.WARNING) {
            log.warn(
                    "Quota WARNING for tenant {} | usage={} / limit={} ({}%)",
                    tenantId,
                    currentUsage,
                    monthlyLimit,
                    round(usagePercentage));

        } else if (status == QuotaStatus.EXCEEDED) {
            log.warn(
                    "Quota EXCEEDED (hard cap) for tenant {} | usage={} / "
                            + "limit={} ({}%)",
                    tenantId,
                    currentUsage,
                    monthlyLimit,
                    round(usagePercentage));
        }

        return new QuotaEvaluationResult(
                tenantId,
                currentUsage,
                monthlyLimit,
                round(usagePercentage),
                status,
                hardCapEnabled
        );
    }

    public QuotaSummaryResponse getUsageSummary(String tenantId) {

        TenantQuotaConfig config = loadConfig(tenantId);

        long monthlyLimit = config.getMonthlyUnitLimit();

        long currentUsage =
                counterRepository.get(
                        tenantId,
                        counterRepository.currentMonth());

        double usagePercentage =
                monthlyLimit <= 0
                        ? 100.0
                        : ((double) currentUsage / monthlyLimit) * 100.0;

        QuotaStatus status =
                resolveStatus(
                        currentUsage,
                        monthlyLimit,
                        usagePercentage,
                        config.isHardCapEnabled(),
                        config.getAlertThresholdPercent());

        return new QuotaSummaryResponse(
                tenantId,
                config.getTierName(),
                monthlyLimit,
                currentUsage,
                round(usagePercentage),
                config.getAlertThresholdPercent(),
                config.isHardCapEnabled(),
                status
        );
    }

    public TenantQuotaConfig getConfig(String tenantId) {
        return loadConfig(tenantId);
    }

    @Transactional
    public TenantQuotaConfig updateConfig(
            String tenantId,
            QuotaConfigRequest request) {

        if (request.monthlyUnitLimit() <= 0) {
            throw new IllegalArgumentException(
                    "monthlyUnitLimit must be greater than 0");
        }

        TenantQuotaConfig config =
                configRepository.findById(tenantId)
                        .orElseGet(TenantQuotaConfig::new);

        boolean isNew = config.getTenantId() == null;

        config.setTenantId(tenantId);
        config.setTierName(request.tierName());
        config.setMonthlyUnitLimit(request.monthlyUnitLimit());
        config.setHardCapEnabled(request.hardCapEnabled());
        config.setAlertThresholdPercent(request.alertThresholdPercent());
        config.setUnitRateDollars(request.unitRateDollars());

        if (isNew) {
            config.setCreatedAt(Instant.now());
        }

        TenantQuotaConfig saved =
                configRepository.save(config);

        log.info(
                "Quota configuration {} for tenant {} | tier={} limit={} "
                        + "threshold={}% hardCap={} rate={}",
                isNew ? "created" : "updated",
                tenantId,
                saved.getTierName(),
                saved.getMonthlyUnitLimit(),
                saved.getAlertThresholdPercent(),
                saved.isHardCapEnabled(),
                saved.getUnitRateDollars());

        return saved;
    }

    private TenantQuotaConfig loadConfig(String tenantId) {

        return configRepository.findById(tenantId)
                .orElseGet(() ->
                        provisionDefaultConfig(tenantId));
    }

    private TenantQuotaConfig provisionDefaultConfig(String tenantId) {

        TenantQuotaConfig config = new TenantQuotaConfig();
        config.setTenantId(tenantId);
        config.setTierName("FREE_TIER");
        config.setMonthlyUnitLimit(10000L);
        config.setHardCapEnabled(true);
        config.setAlertThresholdPercent(80);
        config.setUnitRateDollars(new java.math.BigDecimal("0.005000"));
        config.setCreatedAt(Instant.now());

        TenantQuotaConfig saved =
                configRepository.save(config);

        log.warn(
                "Auto-provisioned default FREE_TIER quota config for "
                        + "unknown tenant {}",
                tenantId);

        return saved;
    }

    private QuotaStatus resolveStatus(
            long currentUsage,
            long monthlyLimit,
            double usagePercentage,
            boolean hardCapEnabled,
            int alertThresholdPercent) {

        if (hardCapEnabled && currentUsage >= monthlyLimit) {
            return QuotaStatus.EXCEEDED;
        }

        if (usagePercentage >= alertThresholdPercent) {
            return QuotaStatus.WARNING;
        }

        return QuotaStatus.NORMAL;
    }

    private void notifyThresholds(
            String tenantId,
            String month,
            int alertThresholdPercent,
            boolean hardCapEnabled,
            long currentUsage,
            long monthlyLimit,
            boolean hardCapReached,
            double usagePercentage) {

        // Independent, one-shot alerts. SETNX deduplicates per
        // tenant + month + threshold, so repeated events do not
        // re-dispatch the same alert.
        if (usagePercentage >= alertThresholdPercent) {

            publishOnce(
                    new QuotaAlertEvent(
                            tenantId,
                            month,
                            QuotaStatus.WARNING,
                            currentUsage,
                            monthlyLimit,
                            usagePercentage),
                    tenantId,
                    month,
                    alertThresholdPercent);
        }

        if (hardCapEnabled && hardCapReached) {

            publishOnce(
                    new QuotaAlertEvent(
                            tenantId,
                            month,
                            QuotaStatus.EXCEEDED,
                            currentUsage,
                            monthlyLimit,
                            usagePercentage),
                    tenantId,
                    month,
                    100);
        }
    }

    private void publishOnce(
            QuotaAlertEvent event,
            String tenantId,
            String month,
            int threshold) {

        if (counterRepository.tryAcquireAlert(
                tenantId,
                month,
                threshold,
                ALERT_LOCK_TTL)) {

            alertPublisher.publish(event);
        }
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}