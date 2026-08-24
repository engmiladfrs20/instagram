CREATE TABLE IF NOT EXISTS outbound_deliveries (
  workspace_id TEXT NOT NULL,
  delivery_key TEXT NOT NULL,
  event_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, delivery_key),
  FOREIGN KEY (workspace_id) REFERENCES workspace_state(workspace_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_outbound_deliveries_updated_at
  ON outbound_deliveries(updated_at);
