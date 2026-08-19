-- Add phone-number auth support (TEC-91): optional phone column on users,
-- plus a durable OTP code store for phone+OTP sign-in/sign-up.
-- Additive and nullable throughout; existing email/password auth is unaffected.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_idx
  ON users (phone)
  WHERE phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS otp_codes_phone_expires_idx
  ON otp_codes (phone, expires_at);
