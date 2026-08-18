CREATE TABLE IF NOT EXISTS waitlist (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed')),
  confirmation_token_hash TEXT,
  requested_at TEXT NOT NULL,
  confirmed_at TEXT,
  consent_version TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS waitlist_status_idx ON waitlist(status);
CREATE INDEX IF NOT EXISTS waitlist_requested_at_idx ON waitlist(requested_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_started_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON rate_limits(window_started_at);
