-- Add website_url and deadline_text support for education items
-- Run this migration on your Supabase/Postgres database

-- Create columns (Postgres supports IF NOT EXISTS for ADD COLUMN)
ALTER TABLE products_services ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE products_services ADD COLUMN IF NOT EXISTS deadline_text TEXT;

-- Add length constraint for website_url. Postgres does NOT support "ADD CONSTRAINT IF NOT EXISTS"
-- so we wrap it in a DO block and ignore duplicate_object errors if it already exists.
DO $$
BEGIN
  BEGIN
    ALTER TABLE products_services
      ADD CONSTRAINT chk_website_url_length CHECK (website_url IS NULL OR length(website_url) <= 2048);
  EXCEPTION
    WHEN duplicate_object THEN
      -- Constraint already exists; ignore
      NULL;
  END;
END $$;
