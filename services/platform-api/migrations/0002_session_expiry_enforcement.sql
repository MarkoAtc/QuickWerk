-- Enforce session TTL policy and deterministic expiry cleanup support

BEGIN;

ALTER TABLE sessions
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '12 hours');

UPDATE sessions
SET expires_at = COALESCE(expires_at, created_at + INTERVAL '12 hours');

ALTER TABLE sessions
  ALTER COLUMN expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

COMMIT;
