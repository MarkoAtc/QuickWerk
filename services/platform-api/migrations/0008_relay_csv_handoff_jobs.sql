CREATE TABLE IF NOT EXISTS relay_csv_handoff_jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  row_count INTEGER NOT NULL CHECK (row_count > 0),
  filters_snapshot JSONB NOT NULL,
  csv_payload TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS relay_csv_handoff_jobs_created_at_idx
  ON relay_csv_handoff_jobs (created_at DESC);

CREATE INDEX IF NOT EXISTS relay_csv_handoff_jobs_expires_at_idx
  ON relay_csv_handoff_jobs (expires_at);
