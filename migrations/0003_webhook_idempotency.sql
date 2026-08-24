CREATE TABLE IF NOT EXISTS webhook_idempotency (
  workspace_id TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  event_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, dedupe_key),
  FOREIGN KEY (workspace_id) REFERENCES workspace_state(workspace_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_webhook_idempotency_created_at
  ON webhook_idempotency(created_at);
