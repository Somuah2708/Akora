-- Add scholarship-specific columns to products_services table
-- This allows scholarships to have all necessary fields for display and filtering
-- Idempotent: uses IF NOT EXISTS

ALTER TABLE products_services
-- Basic scholarship fields
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS amount TEXT,
ADD COLUMN IF NOT EXISTS deadline TEXT,
ADD COLUMN IF NOT EXISTS eligibility TEXT,
-- Additional scholarship details
ADD COLUMN IF NOT EXISTS application_url TEXT,
ADD COLUMN IF NOT EXISTS requirements TEXT,
ADD COLUMN IF NOT EXISTS benefits TEXT,
ADD COLUMN IF NOT EXISTS source_organization TEXT,
-- Array fields for categorization
ADD COLUMN IF NOT EXISTS scholarship_types TEXT[],
ADD COLUMN IF NOT EXISTS eligibility_levels TEXT[],
ADD COLUMN IF NOT EXISTS fields_of_study TEXT[],
-- Funding information
ADD COLUMN IF NOT EXISTS funding_currency TEXT DEFAULT 'USD',
-- Renewable and awards information
ADD COLUMN IF NOT EXISTS is_renewable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS number_of_awards INTEGER;

-- Update existing scholarship columns that might already exist from other migrations
-- These were added by ADD_EDUCATION_WEBSITE_DEADLINE_TEXT.sql but we ensure they exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products_services' 
                   AND column_name = 'website_url') THEN
        ALTER TABLE products_services ADD COLUMN website_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products_services' 
                   AND column_name = 'deadline_text') THEN
        ALTER TABLE products_services ADD COLUMN deadline_text TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products_services' 
                   AND column_name = 'contact_email') THEN
        ALTER TABLE products_services ADD COLUMN contact_email TEXT;
    END IF;
END $$;

-- Add comments to explain the columns
COMMENT ON COLUMN products_services.name IS 'Scholarship name (for backward compatibility with old code using "name" instead of "title")';
COMMENT ON COLUMN products_services.amount IS 'Funding amount for scholarships (text format for display)';
COMMENT ON COLUMN products_services.deadline IS 'Application deadline (date or text description)';
COMMENT ON COLUMN products_services.eligibility IS 'Basic eligibility criteria';
COMMENT ON COLUMN products_services.application_url IS 'Direct link to scholarship application';
COMMENT ON COLUMN products_services.requirements IS 'Detailed eligibility requirements';
COMMENT ON COLUMN products_services.benefits IS 'Benefits and coverage details';
COMMENT ON COLUMN products_services.source_organization IS 'Organization providing the scholarship';
COMMENT ON COLUMN products_services.scholarship_types IS 'Array of scholarship types (merit-based, need-based, athletic, etc.)';
COMMENT ON COLUMN products_services.eligibility_levels IS 'Array of eligible education levels (undergraduate, graduate, postgraduate, etc.)';
COMMENT ON COLUMN products_services.fields_of_study IS 'Array of applicable fields of study (STEM, Business, Arts, etc.)';
COMMENT ON COLUMN products_services.funding_currency IS 'Currency for funding amount (USD or GHS)';
COMMENT ON COLUMN products_services.is_renewable IS 'Whether the scholarship can be renewed for multiple years';
COMMENT ON COLUMN products_services.number_of_awards IS 'Number of scholarships awarded per cycle';

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_products_services_scholarship_types ON products_services USING GIN(scholarship_types);
CREATE INDEX IF NOT EXISTS idx_products_services_eligibility_levels ON products_services USING GIN(eligibility_levels);
CREATE INDEX IF NOT EXISTS idx_products_services_fields_of_study ON products_services USING GIN(fields_of_study);
CREATE INDEX IF NOT EXISTS idx_products_services_deadline ON products_services(deadline);
CREATE INDEX IF NOT EXISTS idx_products_services_funding_currency ON products_services(funding_currency);
