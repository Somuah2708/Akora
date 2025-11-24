-- Add pricing_type column to products_services table
-- This enables flexible pricing: Fixed Price, Negotiable, or Call for Price
-- Run this in Supabase SQL Editor

ALTER TABLE products_services 
ADD COLUMN IF NOT EXISTS pricing_type TEXT 
CHECK (pricing_type IN ('fixed', 'negotiable', 'contact'))
DEFAULT 'fixed';

-- Add comment for documentation
COMMENT ON COLUMN products_services.pricing_type IS 'Pricing model: fixed (show price), negotiable (price + negotiable tag), contact (call for price)';

-- Update existing records to have 'fixed' pricing type
UPDATE products_services 
SET pricing_type = 'fixed' 
WHERE pricing_type IS NULL;
