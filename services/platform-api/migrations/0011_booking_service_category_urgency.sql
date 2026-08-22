-- Add structured category/urgency fields so pricing can key off booking data instead of
-- the free-text requested_service string. Nullable/unconstrained at the DB level (validated
-- against known ids at the service layer only, matching requested_service itself).

BEGIN;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS service_category TEXT,
  ADD COLUMN IF NOT EXISTS urgency TEXT;

COMMIT;
