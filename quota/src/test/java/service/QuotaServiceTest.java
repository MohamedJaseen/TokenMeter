package service;

import alert.QuotaAlertEvent;
import alert.QuotaAlertPublisher;
import domain.QuotaEvaluationResult;
import domain.QuotaStatus;
import domain.TenantQuotaConfig;
import exception.QuotaConfigNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import redis.QuotaCounterRepository;
import repository.TenantQuotaConfigRepository;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class QuotaServiceTest {

    private TenantQuotaConfigRepository configRepository;
    private QuotaCounterRepository counterRepository;
    private QuotaAlertPublisher alertPublisher;
    private QuotaService quotaService;

    @BeforeEach
    void setUp() {

        configRepository = mock(TenantQuotaConfigRepository.class);
        counterRepository = mock(QuotaCounterRepository.class);
        alertPublisher = mock(QuotaAlertPublisher.class);

        quotaService = new QuotaService(
                configRepository,
                counterRepository,
                alertPublisher);

        when(counterRepository.currentMonth()).thenReturn("2026-09");
        lenient().when(configRepository.findById("tenantA"))
                .thenReturn(Optional.of(config(10000, true, 80)));
    }

    private TenantQuotaConfig config(
            long monthlyLimit,
            boolean hardCapEnabled,
            int alertThresholdPercent) {

        TenantQuotaConfig config = new TenantQuotaConfig();
        config.setTenantId("tenantA");
        config.setTierName("PRO");
        config.setMonthlyUnitLimit(monthlyLimit);
        config.setHardCapEnabled(hardCapEnabled);
        config.setAlertThresholdPercent(alertThresholdPercent);
        config.setUnitRateDollars(new BigDecimal("0.005000"));
        return config;
    }

    private void stubIncrement(long usage) {
        when(counterRepository.increment(anyString(), anyString(), anyLong()))
                .thenReturn(usage);
    }

    private void stubAlertLocks() {

        Set<String> acquired = ConcurrentHashMap.newKeySet();

        when(counterRepository.tryAcquireAlert(
                anyString(), anyString(), anyInt(), any()))
                .thenAnswer(invocation -> {

                    String tenantId = invocation.getArgument(0);
                    String month = invocation.getArgument(1);
                    int threshold = invocation.getArgument(2);

                    return acquired.add(
                            QuotaCounterRepository.alertKey(
                                    tenantId, month, threshold));
                });
    }

    @Test
    void normalUsage() {

        stubIncrement(5000L);

        QuotaEvaluationResult result =
                quotaService.evaluate("tenantA", "api_calls", 5000);

        assertThat(result.status()).isEqualTo(QuotaStatus.NORMAL);
        assertThat(result.currentUsage()).isEqualTo(5000L);
        assertThat(result.monthlyLimit()).isEqualTo(10000L);
        assertThat(result.usagePercentage()).isEqualTo(50.0);

        verify(alertPublisher, never()).publish(any());
        verify(counterRepository, never())
                .tryAcquireAlert(anyString(), anyString(), anyInt(), any());
    }

    @Test
    void warningThreshold() {

        stubIncrement(8000L);
        stubAlertLocks();

        QuotaEvaluationResult result =
                quotaService.evaluate("tenantA", "api_calls", 8000);

        assertThat(result.status()).isEqualTo(QuotaStatus.WARNING);
        assertThat(result.usagePercentage()).isEqualTo(80.0);

        verify(alertPublisher).publish(
                argThat(e ->
                        e.status() == QuotaStatus.WARNING
                                && e.currentUsage() == 8000L));
        verify(counterRepository, times(1))
                .tryAcquireAlert("tenantA", "2026-09", 80, Duration.ofDays(31));
    }

    @Test
    void hardCap() {

        stubIncrement(10000L);
        stubAlertLocks();

        QuotaEvaluationResult result =
                quotaService.evaluate("tenantA", "api_calls", 10000);

        assertThat(result.status()).isEqualTo(QuotaStatus.EXCEEDED);
        assertThat(result.usagePercentage()).isEqualTo(100.0);
        assertThat(result.hardCapEnabled()).isTrue();

        verify(alertPublisher, times(2)).publish(any());
        verify(counterRepository, times(1))
                .tryAcquireAlert("tenantA", "2026-09", 100, Duration.ofDays(31));
    }

    @Test
    void usageBeyondLimit() {

        stubIncrement(12000L);
        stubAlertLocks();

        QuotaEvaluationResult result =
                quotaService.evaluate("tenantA", "api_calls", 12000);

        assertThat(result.status()).isEqualTo(QuotaStatus.EXCEEDED);
        assertThat(result.usagePercentage()).isEqualTo(120.0);
    }

    @Test
    void atomicIncrementUsedForEvaluation() {

        when(configRepository.findById("tenantA"))
                .thenReturn(Optional.of(config(5000000, true, 80)));

        AtomicLong counter = new AtomicLong(4000000L);

        when(counterRepository.increment(anyString(), anyString(), anyLong()))
                .thenAnswer(invocation ->
                        counter.addAndGet(invocation.getArgument(2)));

        QuotaEvaluationResult result =
                quotaService.evaluate("tenantA", "api_calls", 1000);

        verify(counterRepository).increment("tenantA", "2026-09", 1000L);
        assertThat(result.currentUsage()).isEqualTo(4001000L);
        assertThat(result.usagePercentage()).isEqualTo(80.02);
    }

    @Test
    void concurrentIncrementsDoNotLoseUpdates() throws InterruptedException {

        TenantQuotaConfig config = config(1000000L, true, 80);

        TestQuotaCounter realCounter = new TestQuotaCounter();
        QuotaService service = new QuotaService(
                configRepository,
                realCounter,
                alertPublisher);

        when(configRepository.findById("tenantA"))
                .thenReturn(Optional.of(config));

        int threads = 8;
        int incrementsPerThread = 250;
        long expected = (long) threads * incrementsPerThread;

        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);

        for (int t = 0; t < threads; t++) {

            executor.submit(() -> {

                try {
                    start.await();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;
                }

                for (int i = 0; i < incrementsPerThread; i++) {
                    service.evaluate("tenantA", "api_calls", 1);
                }
            });
        }

        start.countDown();
        executor.shutdown();

        assertThat(executor.awaitTermination(10, TimeUnit.SECONDS)).isTrue();

        assertThat(realCounter.total("tenantA", "2026-09"))
                .isEqualTo(expected);
    }

    @Test
    void duplicateAlertPrevented() {

        stubIncrement(12000L);
        stubAlertLocks();

        QuotaEvaluationResult first =
                quotaService.evaluate("tenantA", "api_calls", 12000);
        QuotaEvaluationResult second =
                quotaService.evaluate("tenantA", "api_calls", 12000);

        assertThat(first.status()).isEqualTo(QuotaStatus.EXCEEDED);
        assertThat(second.status()).isEqualTo(QuotaStatus.EXCEEDED);

        verify(alertPublisher, times(1)).publish(
                argThat(e -> e.status() == QuotaStatus.EXCEEDED));
        verify(alertPublisher, times(1)).publish(
                argThat(e -> e.status() == QuotaStatus.WARNING));
    }

    @Test
    void monthlyIsolation() {

        AtomicReference<String> lastMonth = new AtomicReference<>();

        when(counterRepository.increment(anyString(), anyString(), anyLong()))
                .thenAnswer(invocation -> {

                    lastMonth.set(invocation.getArgument(1));
                    return invocation.getArgument(2);
                });

        when(counterRepository.tryAcquireAlert(anyString(), anyString(), anyInt(), any()))
                .thenReturn(false);

        quotaService.evaluate("tenantA", "api_calls", 100, "2026-09");
        quotaService.evaluate("tenantA", "api_calls", 100, "2026-10");

        assertThat(lastMonth.get()).isEqualTo("2026-10");

        assertThat(QuotaCounterRepository.counterKey("tenantA", "2026-09"))
                .isEqualTo("quota:tenantA:2026-09");
        assertThat(QuotaCounterRepository.counterKey("tenantA", "2026-10"))
                .isEqualTo("quota:tenantA:2026-10");
        assertThat(QuotaCounterRepository.counterKey("tenantA", "2026-09"))
                .isNotEqualTo(QuotaCounterRepository.counterKey("tenantA", "2026-10"));
    }

    @Test
    void missingConfigThrowsNotFound() {

        when(configRepository.findById("missing"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                quotaService.evaluate("missing", "api_calls", 100))
                .isInstanceOf(QuotaConfigNotFoundException.class);

        assertThatThrownBy(() ->
                quotaService.getUsageSummary("missing"))
                .isInstanceOf(QuotaConfigNotFoundException.class);

        assertThatThrownBy(() ->
                quotaService.getConfig("missing"))
                .isInstanceOf(QuotaConfigNotFoundException.class);
    }

    @Test
    void invalidUnitsRejected() {

        stubIncrement(0L);

        assertThatThrownBy(() ->
                quotaService.evaluate("tenantA", "api_calls", 0))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() ->
                quotaService.evaluate("tenantA", "api_calls", -5))
                .isInstanceOf(IllegalArgumentException.class);

        verify(counterRepository, never())
                .increment(anyString(), anyString(), anyLong());
    }

    @Test
    void hardCapDisabledAllowsExceededLimitWithoutExceededStatus() {

        when(configRepository.findById("tenantA"))
                .thenReturn(Optional.of(config(10000, false, 80)));

        stubIncrement(12000L);
        stubAlertLocks();

        QuotaEvaluationResult result =
                quotaService.evaluate("tenantA", "api_calls", 12000);

        assertThat(result.status()).isEqualTo(QuotaStatus.WARNING);
        assertThat(result.usagePercentage()).isEqualTo(120.0);
        assertThat(result.hardCapEnabled()).isFalse();
        verify(alertPublisher, never()).publish(
                argThat(e -> e.status() == QuotaStatus.EXCEEDED));
    }

    @Test
    void usageSummaryIsReadOnly() {

        when(counterRepository.get("tenantA", "2026-09"))
                .thenReturn(2857000L);

        var summary = quotaService.getUsageSummary("tenantA");

        assertThat(summary.tenantId()).isEqualTo("tenantA");
        assertThat(summary.tier()).isEqualTo("PRO");
        assertThat(summary.monthlyLimit()).isEqualTo(10000L);
        assertThat(summary.currentUsage()).isEqualTo(2857000L);
        assertThat(summary.usagePercentage()).isEqualTo(28570.0);
        assertThat(summary.alertThresholdPercent()).isEqualTo(80);
        assertThat(summary.hardCapEnabled()).isTrue();
        assertThat(summary.status()).isEqualTo(QuotaStatus.EXCEEDED);

        verify(counterRepository, never()).increment(anyString(), anyString(), anyLong());
    }

    private static class TestQuotaCounter extends QuotaCounterRepository {

        private final ConcurrentHashMap<String, AtomicLong> counters =
                new ConcurrentHashMap<>();

        TestQuotaCounter() {
            super(null);
        }

        @Override
        public String currentMonth() {
            return "2026-09";
        }

        @Override
        public long increment(String tenantId, String month, long units) {

            AtomicLong counter =
                    counters.computeIfAbsent(
                            counterKey(tenantId, month),
                            k -> new AtomicLong());

            return counter.addAndGet(units);
        }

        long total(String tenantId, String month) {

            AtomicLong counter = counters.get(counterKey(tenantId, month));
            return counter == null ? 0L : counter.get();
        }
    }
}