-- =====================================================
-- CREATE APP SETTINGS TABLE
-- Run this in Supabase SQL Editor
-- =====================================================
-- This table stores app-wide settings that admins can configure

-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default secretariat phone number
INSERT INTO app_settings (key, value)
VALUES ('secretariat_phone', '+233302765432')
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read app settings" ON app_settings;
DROP POLICY IF EXISTS "Only admins can insert app settings" ON app_settings;
DROP POLICY IF EXISTS "Only admins can update app settings" ON app_settings;
DROP POLICY IF EXISTS "Only admins can delete app settings" ON app_settings;

-- Policy 1: Anyone can read settings (public data like phone numbers)
CREATE POLICY "Anyone can read app settings"
ON app_settings FOR SELECT
TO public
USING (true);

-- Policy 2: Only admins can insert settings
CREATE POLICY "Only admins can insert app settings"
ON app_settings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy 3: Only admins can update settings
CREATE POLICY "Only admins can update app settings"
ON app_settings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Policy 4: Only admins can delete settings
CREATE POLICY "Only admins can delete app settings"
ON app_settings FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ App settings table created successfully!';
  RAISE NOTICE '✅ Default secretariat phone number inserted';
  RAISE NOTICE '✅ RLS policies applied (read: public, write: admins only)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '1. Admins can now update the secretariat phone number via the settings button';
  RAISE NOTICE '2. The phone number will be displayed in the OAA Shop contact section';
END $$;
