CREATE TABLE IF NOT EXISTS payment_failures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  payment_data JSONB,
  error TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX idx_payment_failures_order_id ON payment_failures(order_id);
CREATE INDEX idx_payment_failures_unresolved ON payment_failures(resolved) WHERE resolved = FALSE;