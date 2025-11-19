-- Add contact and location columns to products_services table
-- This allows sellers to provide contact information and location for their listings

-- Add columns if they don't exist
DO $$
BEGIN
  -- Add contact_email column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE products_services ADD COLUMN contact_email TEXT;
  END IF;

  -- Add contact_phone column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE products_services ADD COLUMN contact_phone TEXT;
  END IF;

  -- Add location column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'location'
  ) THEN
    ALTER TABLE products_services ADD COLUMN location TEXT;
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN products_services.contact_email IS 'Seller contact email for inquiries';
COMMENT ON COLUMN products_services.contact_phone IS 'Seller contact phone for inquiries';
COMMENT ON COLUMN products_services.location IS 'Location where product/service is available';

-- Create indexes for location searches
CREATE INDEX IF NOT EXISTS idx_products_services_location ON products_services(location) WHERE location IS NOT NULL;
