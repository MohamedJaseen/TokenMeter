package persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "usage_hourly_aggregates")
@IdClass(UsageHourlyAggregateId.class)
public class UsageHourlyAggregate {

    @Id
    @Column(name = "tenant_id", length = 64, nullable = false)
    private String tenantId;

    @Id
    @Column(name = "metric_name", length = 64, nullable = false)
    private String metricName;

    @Id
    @Column(name = "bucket_hour", nullable = false)
    private Instant bucketHour;

    @Column(name = "total_units", nullable = false)
    private long totalUnits;

    @Column(name = "total_cost", nullable = false, precision = 12, scale = 4)
    private BigDecimal totalCost;

    @Column(name = "last_updated_at")
    private Instant lastUpdatedAt;

    public UsageHourlyAggregate() {
    }

    public String getTenantId() {
        return tenantId;
    }

    public void setTenantId(String tenantId) {
        this.tenantId = tenantId;
    }

    public String getMetricName() {
        return metricName;
    }

    public void setMetricName(String metricName) {
        this.metricName = metricName;
    }

    public Instant getBucketHour() {
        return bucketHour;
    }

    public void setBucketHour(Instant bucketHour) {
        this.bucketHour = bucketHour;
    }

    public long getTotalUnits() {
        return totalUnits;
    }

    public void setTotalUnits(long totalUnits) {
        this.totalUnits = totalUnits;
    }

    public BigDecimal getTotalCost() {
        return totalCost;
    }

    public void setTotalCost(BigDecimal totalCost) {
        this.totalCost = totalCost;
    }

    public Instant getLastUpdatedAt() {
        return lastUpdatedAt;
    }

    public void setLastUpdatedAt(Instant lastUpdatedAt) {
        this.lastUpdatedAt = lastUpdatedAt;
    }
}