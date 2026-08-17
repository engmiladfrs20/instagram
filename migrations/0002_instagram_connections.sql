CREATE TABLE IF NOT EXISTS instagram_connections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  meta_ig_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  profile_pic_url TEXT,
  account_type TEXT NOT NULL DEFAULT 'BUSINESS',
  access_token_ciphertext TEXT NOT NULL,
  token_expires_at TEXT NOT NULL,
  granted_scopes TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'reauth_required', 'disconnected')),
  webhook_status TEXT NOT NULL DEFAULT 'pending' CHECK (webhook_status IN ('active', 'pending', 'failed')),
  last_token_check_at TEXT,
  last_webhook_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspace_state(workspace_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_instagram_connections_meta_user ON instagram_connections(meta_ig_user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_connections_workspace ON instagram_connections(workspace_id, status);

CREATE TABLE IF NOT EXISTS instagram_oauth_states (
  state_hash TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (workspace_id) REFERENCES workspace_state(workspace_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_instagram_oauth_states_expiry ON instagram_oauth_states(expires_at);
