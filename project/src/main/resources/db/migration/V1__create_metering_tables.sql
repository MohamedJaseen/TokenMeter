CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE usage_hourly_aggregates (
    tenant_id VARCHAR(64) NOT NULL,
    metric_name VARCHAR(64) NOT NULL,
    bucket_hour TIMESTAMP WITH TIME ZONE NOT NULL,
    total_units BIGINT NOT NULL DEFAULT 0,
    total_cost NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    PRIMARY KEY (tenant_id, metric_name, bucket_hour)
);

CREATE INDEX idx_usage_tenant_time
    ON usage_hourly_aggregates(tenant_id, bucket_hour DESC);


CREATE TABLE tenant_quota_configs (
    tenant_id VARCHAR(64) PRIMARY KEY,
    tier_name VARCHAR(32) NOT NULL DEFAULT 'FREE_TIER',
    monthly_unit_limit BIGINT NOT NULL DEFAULT 10000,
    hard_cap_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    alert_threshold_percent INT NOT NULL DEFAULT 80,
    unit_rate_dollars NUMERIC(8, 6) NOT NULL DEFAULT 0.005000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE TABLE tenant_invoices (
    invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    total_units_consumed BIGINT NOT NULL,
    total_amount_billed NUMERIC(12, 2) NOT NULL,
    payment_status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);