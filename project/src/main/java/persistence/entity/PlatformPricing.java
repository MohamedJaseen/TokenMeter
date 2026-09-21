package persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "platform_pricing")
public class PlatformPricing {

    @Id
    @Column(name = "id")
    private Short id;

    @Column(name = "price_per_1k_tokens", nullable = false, precision = 12, scale = 6)
    private BigDecimal pricePer1kTokens;

    @Column(name = "price_per_1k_api_calls", nullable = false, precision = 12, scale = 6)
    private BigDecimal pricePer1kApiCalls;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public PlatformPricing() {
    }

    public Short getId() {
        return id;
    }

    public void setId(Short id) {
        this.id = id;
    }

    public BigDecimal getPricePer1kTokens() {
        return pricePer1kTokens;
    }

    public void setPricePer1kTokens(BigDecimal pricePer1kTokens) {
        this.pricePer1kTokens = pricePer1kTokens;
    }

    public BigDecimal getPricePer1kApiCalls() {
        return pricePer1kApiCalls;
    }

    public void setPricePer1kApiCalls(BigDecimal pricePer1kApiCalls) {
        this.pricePer1kApiCalls = pricePer1kApiCalls;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}