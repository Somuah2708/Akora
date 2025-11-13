-- Add funding currency for scholarships
-- Run this on your Supabase/Postgres database

ALTER TABLE products_services
  ADD COLUMN IF NOT EXISTS funding_currency TEXT;

-- Optional: constrain to known values (commented out to avoid migration failures if other values are used)
-- ALTER TABLE products_services
--   ADD CONSTRAINT chk_funding_currency CHECK (funding_currency IN ('USD','GHS'));
