-- Add dedicated operator role support for auth sessions/users.
-- Backward-safe: broadens allowed roles from ('customer','provider') to include 'operator'.

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('customer', 'provider', 'operator'));
