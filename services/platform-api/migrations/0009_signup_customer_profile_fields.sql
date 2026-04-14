-- Add optional customer registration fields used by auth sign-up.
-- Nullable to preserve backward compatibility with legacy/demo sign-in paths.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT;
