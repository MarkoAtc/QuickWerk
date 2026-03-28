-- Add 'declined' status support to bookings and booking_status_history.
-- Backward-safe / idempotent: constraint drops are IF EXISTS, column add is IF NOT EXISTS.

BEGIN;

-- Widen the bookings status constraint to allow 'declined'
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('submitted', 'accepted', 'declined'));

-- Update the existing provider/status check constraint to also allow declined bookings with a provider
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_accepted_requires_provider;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_accepted_requires_provider CHECK (
    (status = 'accepted' AND provider_user_id IS NOT NULL)
    OR (status = 'declined' AND provider_user_id IS NOT NULL)
    OR (status = 'submitted' AND provider_user_id IS NULL)
  );

-- Add decline_reason column (nullable)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- Widen booking_status_history from_status / to_status constraints
ALTER TABLE booking_status_history
  DROP CONSTRAINT IF EXISTS booking_status_history_from_status_check;

ALTER TABLE booking_status_history
  ADD CONSTRAINT booking_status_history_from_status_check
    CHECK (from_status IS NULL OR from_status IN ('submitted', 'accepted', 'declined'));

ALTER TABLE booking_status_history
  DROP CONSTRAINT IF EXISTS booking_status_history_to_status_check;

ALTER TABLE booking_status_history
  ADD CONSTRAINT booking_status_history_to_status_check
    CHECK (to_status IN ('submitted', 'accepted', 'declined'));

COMMIT;
