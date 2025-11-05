-- =====================================================
-- ADD MISSING COLUMNS TO PRODUCTS_SERVICES TABLE
-- Run this FIRST before inserting universities/scholarships data
-- =====================================================

-- Add columns for education-related data if they don't exist
ALTER TABLE products_services 
ADD COLUMN IF NOT EXISTS funding_amount TEXT,
ADD COLUMN IF NOT EXISTS deadline_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS application_url TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS eligibility_criteria TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'products_services'
AND column_name IN ('funding_amount', 'deadline_date', 'application_url', 'contact_email', 'eligibility_criteria', 'location');

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ All education columns added successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run GHANA_UNIVERSITIES_DATA.sql';
  RAISE NOTICE '2. Run GHANA_SCHOLARSHIPS_DATA.sql';
END $$;
