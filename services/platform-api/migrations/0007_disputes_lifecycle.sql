-- Add disputes lifecycle persistence for operator dispute resolution.

BEGIN;

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reporter_role TEXT NOT NULL CHECK (reporter_role IN ('customer', 'provider')),
  category TEXT NOT NULL CHECK (category IN ('no-show', 'quality', 'billing', 'safety', 'other')),
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'under-review', 'resolved', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  CONSTRAINT disputes_unique_booking_reporter UNIQUE (booking_id, reporter_user_id),
  CONSTRAINT disputes_resolution_fields_consistency CHECK (
    (status IN ('resolved', 'closed') AND resolved_at IS NOT NULL)
    OR (status IN ('open', 'under-review') AND resolved_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_disputes_status_created_at ON disputes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_reporter_user_id_created_at ON disputes(reporter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_booking_id_created_at ON disputes(booking_id, created_at DESC);

COMMIT;
