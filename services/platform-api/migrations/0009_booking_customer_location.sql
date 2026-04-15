-- Add customer_location to preserve bounded address continuity from booking submission.

BEGIN;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS customer_location TEXT;

COMMIT;
