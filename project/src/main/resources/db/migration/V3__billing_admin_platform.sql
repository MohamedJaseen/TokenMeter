-- Invoice generation idempotency: one invoice per tenant + billing period.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_invoice_period
    ON tenant_invoices (tenant_id, billing_period_start, billing_period_end);

-- Platform-wide pricing configuration (single managed row, id = 1).
CREATE TABLE IF NOT EXISTS platform_pricing (
    id SMALLINT PRIMARY KEY,
    price_per_1k_tokens NUMERIC(12, 6) NOT NULL DEFAULT 0.002000,
    price_per_1k_api_calls NUMERIC(12, 6) NOT NULL DEFAULT 0.005000,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_platform_pricing_singleton CHECK (id = 1)
);

-- Seed defaults.
INSERT INTO platform_pricing (id, price_per_1k_tokens, price_per_1k_api_calls)
VALUES (1, 0.002000, 0.005000)
ON CONFLICT (id) DO NOTHING;