package persistence.entity;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

public class UsageHourlyAggregateId implements Serializable {

    private String tenantId;
    private String metricName;
    private Instant bucketHour;

    public UsageHourlyAggregateId() {
    }

    public UsageHourlyAggregateId(
            String tenantId,
            String metricName,
            Instant bucketHour) {

        this.tenantId = tenantId;
        this.metricName = metricName;
        this.bucketHour = bucketHour;
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

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof UsageHourlyAggregateId that)) {
            return false;
        }

        return Objects.equals(tenantId, that.tenantId)
                && Objects.equals(metricName, that.metricName)
                && Objects.equals(bucketHour, that.bucketHour);
    }

    @Override
    public int hashCode() {
        return Objects.hash(tenantId, metricName, bucketHour);
    }
}