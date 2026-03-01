-- SBAL D1 Schema (from SPEC.md Section 4)

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  api_key TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT NOT NULL,
  status TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  current_period_end DATETIME,
  trial_end DATETIME,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Usage Records
CREATE TABLE IF NOT EXISTS usage_records (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
  stripe_subscription_item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  stripe_usage_record_id TEXT,
  description TEXT
);

-- Customer Webhook Configs
CREATE TABLE IF NOT EXISTS webhook_configs (
  customer_id TEXT PRIMARY KEY REFERENCES customers(id),
  target_url TEXT NOT NULL,
  signing_secret TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- API Logs
CREATE TABLE IF NOT EXISTS api_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  latency_ms INTEGER,
  cf_request_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Webhook Failures
CREATE TABLE IF NOT EXISTS webhook_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  customer_id TEXT,
  attempt_count INTEGER DEFAULT 1,
  last_error TEXT,
  next_retry_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_logs_customer_created ON api_logs(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_status ON subscriptions(customer_id, status);