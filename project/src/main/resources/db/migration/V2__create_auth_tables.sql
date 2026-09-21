-- =====================================================================
-- V2: Tenant identity, authentication, refresh tokens, and API keys
-- =====================================================================

CREATE TABLE tenants (
    tenant_id     VARCHAR(64) PRIMARY KEY,
    tenant_name   VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    status        VARCHAR(24)  NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE app_users (
    user_id       BIGSERIAL PRIMARY KEY,
    tenant_id     VARCHAR(64),
    username      VARCHAR(128) NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    email         VARCHAR(255),
    role          VARCHAR(32)  NOT NULL DEFAULT 'TENANT_USER',
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_app_users_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

CREATE TABLE refresh_tokens (
    token_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES app_users(user_id)
);

CREATE TABLE api_keys (
    key_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    VARCHAR(64) NOT NULL,
    key_hash     VARCHAR(64) NOT NULL UNIQUE,
    prefix       VARCHAR(32),
    label        VARCHAR(255),
    revoked      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,

    CONSTRAINT fk_api_keys_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);

-- =====================================================================
-- Seed data
-- =====================================================================

INSERT INTO tenants (tenant_id, tenant_name, contact_email, status) VALUES
    ('tenantA', 'Tenant Alpha',   'tenantA@example.com', 'ACTIVE'),
    ('tenantB', 'Tenant Bravo',   'tenantB@example.com', 'ACTIVE'),
    ('tenantC', 'Tenant Charlie', 'tenantC@example.com', 'ACTIVE');

-- All seeded users share the same demo password: "password"
INSERT INTO app_users (tenant_id, username, password_hash, email, role, enabled) VALUES
    (NULL,        'admin',         '$2b$10$rvlkSivoTMRJmVyjjT/QNOq9VwJGyb6a1CKXXcZjAr4hvbi9UDcDq', 'admin@platform.io',      'SUPER_ADMIN', TRUE),
    ('tenantA',   'tenantA_admin', '$2b$10$rvlkSivoTMRJmVyjjT/QNOq9VwJGyb6a1CKXXcZjAr4hvbi9UDcDq', 'admin@tenantA.io',        'TENANT_USER', TRUE),
    ('tenantB',   'tenantB_admin', '$2b$10$rvlkSivoTMRJmVyjjT/QNOq9VwJGyb6a1CKXXcZjAr4hvbi9UDcDq', 'admin@tenantB.io',        'TENANT_USER', TRUE),
    ('tenantC',   'tenantC_admin', '$2b$10$rvlkSivoTMRJmVyjjT/QNOq9VwJGyb6a1CKXXcZjAr4hvbi9UDcDq', 'admin@tenantC.io',        'TENANT_USER', TRUE);

-- Seed API keys matching the legacy static config so the existing
-- pipeline keeps working (X-API-KEY: key_123 -> tenantA, etc.)
INSERT INTO api_keys (tenant_id, key_hash, prefix, label) VALUES
    ('tenantA', '5feb89c42cd706000626d53195bbe096ce8d1b01390d1b90bb7d3589591c16f5', 'key_123', 'Seed key - Tenant A'),
    ('tenantB', '2e3c588b9878f29bac12ec525203848d292f1fc87503ecd9455a5e46e4cf35b2', 'key_456', 'Seed key - Tenant B'),
    ('tenantC', 'ca3b082995c85ab5e4a9203e55b92a22330aed520a0d99de30d24b66bb28c193', 'key_789', 'Seed key - Tenant C');

-- Default quota configs for the seeded tenants
INSERT INTO tenant_quota_configs
    (tenant_id, tier_name, monthly_unit_limit, hard_cap_enabled, alert_threshold_percent, unit_rate_dollars)
VALUES
    ('tenantA', 'ENTERPRISE', 1000000, TRUE,  80, 0.010000),
    ('tenantB', 'PRO',         100000, TRUE,  80, 0.005000),
    ('tenantC', 'FREE_TIER',    10000, TRUE,  80, 0.001000)
ON CONFLICT (tenant_id) DO UPDATE
    SET unit_rate_dollars = EXCLUDED.unit_rate_dollars;