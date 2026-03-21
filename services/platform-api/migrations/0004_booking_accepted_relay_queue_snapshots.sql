-- 0004_booking_accepted_relay_queue_snapshots.sql
-- durable relay queue observability snapshots for operator/readiness trend inspection

BEGIN;

CREATE TABLE IF NOT EXISTS booking_accepted_relay_queue_snapshots (
  id BIGSERIAL PRIMARY KEY,
  captured_at TIMESTAMPTZ NOT NULL,
  correlation_id TEXT NOT NULL,
  depth INTEGER NOT NULL CHECK (depth >= 0),
  due_count INTEGER NOT NULL CHECK (due_count >= 0),
  dead_letter_count INTEGER NOT NULL CHECK (dead_letter_count >= 0),
  processing_lag_ms INTEGER NOT NULL CHECK (processing_lag_ms >= 0)
);

CREATE INDEX IF NOT EXISTS idx_booking_accepted_relay_queue_snapshots_captured
  ON booking_accepted_relay_queue_snapshots(captured_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_booking_accepted_relay_queue_snapshots_correlation_captured
  ON booking_accepted_relay_queue_snapshots(correlation_id, captured_at DESC, id DESC);

COMMIT;
