CREATE TABLE usage_event_ledger (
    event_id         VARCHAR(128) NOT NULL,
    tenant_id        VARCHAR(64) NOT NULL,
    metric_name      VARCHAR(64) NOT NULL,
    units            BIGINT NOT NULL,
    event_timestamp  TIMESTAMP WITH TIME ZONE NOT NULL,
    processed_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    processing_status VARCHAR(24) NOT NULL,
    duplicate        BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (tenant_id, event_id)
);

CREATE INDEX idx_usage_event_ledger_tenant_time
    ON usage_event_ledger (tenant_id, event_timestamp DESC);

CREATE INDEX idx_usage_event_ledger_metric_time
    ON usage_event_ledger (metric_name, event_timestamp DESC);
