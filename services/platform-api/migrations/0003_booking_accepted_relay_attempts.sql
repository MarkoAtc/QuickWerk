-- QuickWerk platform-api booking.accepted relay transport persistence
-- Adds durable relay attempt storage for Postgres-backed transport mode

BEGIN;

CREATE TABLE IF NOT EXISTS booking_accepted_relay_attempts (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  attempt INTEGER NOT NULL CHECK (attempt > 0),
  max_attempts INTEGER NOT NULL CHECK (max_attempts > 0),
  status TEXT NOT NULL CHECK (status IN ('queued', 'processed', 'retry-scheduled', 'dead-letter')),
  payload_snapshot JSONB NOT NULL,
  retry_snapshot JSONB,
  next_attempt_at TIMESTAMPTZ,
  dlq_snapshot JSONB,
  terminal_marker BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT uq_booking_accepted_relay_attempt UNIQUE (event_id, attempt)
);

CREATE INDEX IF NOT EXISTS idx_booking_accepted_relay_attempts_status_next_attempt
  ON booking_accepted_relay_attempts(status, next_attempt_at);

CREATE INDEX IF NOT EXISTS idx_booking_accepted_relay_attempts_correlation_created
  ON booking_accepted_relay_attempts(correlation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_accepted_relay_attempts_terminal_marker
  ON booking_accepted_relay_attempts(terminal_marker, status);

COMMIT;
