-- Add condition column to products_services table
-- This enables tracking item condition: new, used, or not applicable
-- Run this in Supabase SQL Editor

ALTER TABLE products_services 
ADD COLUMN IF NOT EXISTS condition TEXT 
CHECK (condition IN ('new', 'used', 'not_applicable'))
DEFAULT 'not_applicable';

-- Add comment for documentation
COMMENT ON COLUMN products_services.condition IS 'Item condition: new (brand new), used (pre-owned), not_applicable (for services or when condition does not apply)';

-- Update existing records to have 'not_applicable' condition
UPDATE products_services 
SET condition = 'not_applicable' 
WHERE condition IS NULL;
