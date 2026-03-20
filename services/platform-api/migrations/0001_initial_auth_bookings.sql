-- QuickWerk platform-api initial persistence scaffold
-- Target: PostgreSQL 15+ (PostGIS-ready extension can be enabled later)

BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'provider')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY,
  customer_user_id UUID NOT NULL REFERENCES users(id),
  provider_user_id UUID REFERENCES users(id),
  requested_service TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('submitted', 'accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  CONSTRAINT bookings_accepted_requires_provider CHECK (
    (status = 'accepted' AND provider_user_id IS NOT NULL)
    OR (status = 'submitted' AND provider_user_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_user_id ON bookings(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_user_id ON bookings(provider_user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status_created_at ON bookings(status, created_at DESC);

CREATE TABLE IF NOT EXISTS booking_status_history (
  id BIGSERIAL PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  from_status TEXT CHECK (from_status IN ('submitted', 'accepted')),
  to_status TEXT NOT NULL CHECK (to_status IN ('submitted', 'accepted')),
  actor_user_id UUID NOT NULL REFERENCES users(id),
  actor_role TEXT NOT NULL CHECK (actor_role IN ('customer', 'provider')),
  CONSTRAINT booking_status_history_first_transition CHECK (
    (from_status IS NULL AND to_status = 'submitted')
    OR (from_status IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking_id_changed_at
  ON booking_status_history(booking_id, changed_at DESC);

COMMIT;
