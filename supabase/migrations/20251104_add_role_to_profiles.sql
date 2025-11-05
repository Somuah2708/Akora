-- Add role column to profiles and backfill from is_admin
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('admin','user')) DEFAULT 'user';

-- Backfill: set role = 'admin' where is_admin is true
UPDATE profiles SET role = 'admin' WHERE is_admin IS TRUE;

-- Optional: comment for docs
COMMENT ON COLUMN profiles.role IS 'User role for app permissions: admin or user (default user).';
