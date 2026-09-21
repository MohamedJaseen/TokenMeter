package domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "tenant_quota_configs")
public class TenantQuotaConfig {

    @Id
    @Column(name = "tenant_id", length = 64)
    private String tenantId;

    @Column(name = "tier_name", nullable = false, length = 32)
    private String tierName = "FREE_TIER";

    @Column(name = "monthly_unit_limit", nullable = false)
    private long monthlyUnitLimit = 10000L;

    @Column(name = "hard_cap_enabled", nullable = false)
    private boolean hardCapEnabled = true;

    @Column(name = "alert_threshold_percent", nullable = false)
    private int alertThresholdPercent = 80;

    @Column(name = "unit_rate_dollars", nullable = false, precision = 8, scale = 6)
    private BigDecimal unitRateDollars = new BigDecimal("0.005000");

    @Column(name = "created_at")
    private Instant createdAt;

    public TenantQuotaConfig() {
    }

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getTierName() {
        return tierName;
    }

    public void setTierName(String tierName) {
        this.tierName = tierName;
    }

    public long getMonthlyUnitLimit() {
        return monthlyUnitLimit;
    }

    public void setMonthlyUnitLimit(long monthlyUnitLimit) {
        this.monthlyUnitLimit = monthlyUnitLimit;
    }

    public boolean isHardCapEnabled() {
        return hardCapEnabled;
    }

    public void setHardCapEnabled(boolean hardCapEnabled) {
        this.hardCapEnabled = hardCapEnabled;
    }

    public int getAlertThresholdPercent() {
        return alertThresholdPercent;
    }

    public void setAlertThresholdPercent(int alertThresholdPercent) {
        this.alertThresholdPercent = alertThresholdPercent;
    }

    public BigDecimal getUnitRateDollars() {
        return unitRateDollars;
    }

    public void setUnitRateDollars(BigDecimal unitRateDollars) {
        this.unitRateDollars = unitRateDollars;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}