-- =====================================================
-- ADD MARKETPLACE COLUMNS TO PRODUCTS_SERVICES TABLE
-- Run this in Supabase SQL Editor NOW
-- =====================================================
-- This adds all missing columns needed for the Tonaton/Jiji marketplace clone

-- Add contact and location columns
DO $$
BEGIN
  -- Contact phone column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE products_services ADD COLUMN contact_phone TEXT;
  END IF;

  -- Contact WhatsApp column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'contact_whatsapp'
  ) THEN
    ALTER TABLE products_services ADD COLUMN contact_whatsapp TEXT;
  END IF;

  -- Location city column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'location_city'
  ) THEN
    ALTER TABLE products_services ADD COLUMN location_city TEXT;
  END IF;

  -- Location region column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'location_region'
  ) THEN
    ALTER TABLE products_services ADD COLUMN location_region TEXT;
  END IF;

  -- Region ID foreign key column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'region_id'
  ) THEN
    ALTER TABLE products_services ADD COLUMN region_id UUID;
  END IF;

  -- City ID foreign key column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'city_id'
  ) THEN
    ALTER TABLE products_services ADD COLUMN city_id UUID;
  END IF;

  -- Listing type column (product/service)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'type'
  ) THEN
    ALTER TABLE products_services ADD COLUMN type TEXT CHECK (type IN ('product', 'service'));
  END IF;

  -- Image URLs array for multiple images
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'image_urls'
  ) THEN
    ALTER TABLE products_services ADD COLUMN image_urls TEXT[];
  END IF;

  -- General location column (fallback for legacy data)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'location'
  ) THEN
    ALTER TABLE products_services ADD COLUMN location TEXT;
  END IF;

END $$;

-- Add foreign key constraints if regions/cities tables exist
DO $$
BEGIN
  -- Only add foreign key if regions table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'regions'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'products_services_region_id_fkey'
    ) THEN
      ALTER TABLE products_services 
      ADD CONSTRAINT products_services_region_id_fkey 
      FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL;
    END IF;
  END IF;

  -- Only add foreign key if cities table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'cities'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'products_services_city_id_fkey'
    ) THEN
      ALTER TABLE products_services 
      ADD CONSTRAINT products_services_city_id_fkey 
      FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_services_location_city ON products_services(location_city);
CREATE INDEX IF NOT EXISTS idx_products_services_location_region ON products_services(location_region);
CREATE INDEX IF NOT EXISTS idx_products_services_region_id ON products_services(region_id);
CREATE INDEX IF NOT EXISTS idx_products_services_city_id ON products_services(city_id);
CREATE INDEX IF NOT EXISTS idx_products_services_type ON products_services(type);
CREATE INDEX IF NOT EXISTS idx_products_services_location ON products_services(location) WHERE location IS NOT NULL;

-- Add comments to document the columns
COMMENT ON COLUMN products_services.contact_phone IS 'Seller contact phone for inquiries (alternative to WhatsApp)';
COMMENT ON COLUMN products_services.contact_whatsapp IS 'Seller WhatsApp number for inquiries';
COMMENT ON COLUMN products_services.location_city IS 'City where product/service is available';
COMMENT ON COLUMN products_services.location_region IS 'Region where product/service is available';
COMMENT ON COLUMN products_services.region_id IS 'Foreign key to regions table for dynamic location';
COMMENT ON COLUMN products_services.city_id IS 'Foreign key to cities table for dynamic location';
COMMENT ON COLUMN products_services.type IS 'Type of listing: product or service';
COMMENT ON COLUMN products_services.image_urls IS 'Array of image URLs for listings with multiple images';
COMMENT ON COLUMN products_services.location IS 'General location text (legacy/fallback)';

-- Verify all columns were added successfully
DO $$
DECLARE
  missing_count INT;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM (
    SELECT 'contact_phone' AS col
    UNION SELECT 'contact_whatsapp'
    UNION SELECT 'location_city'
    UNION SELECT 'location_region'
    UNION SELECT 'region_id'
    UNION SELECT 'city_id'
    UNION SELECT 'type'
    UNION SELECT 'image_urls'
    UNION SELECT 'location'
  ) required
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' 
    AND column_name = required.col
  );

  IF missing_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All marketplace columns added successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '1. Run CREATE_LOCATIONS_SYSTEM.sql to enable dynamic location management';
    RAISE NOTICE '2. Test creating a listing in the app';
    RAISE NOTICE '3. Test uploading images with the listing';
  ELSE
    RAISE WARNING '⚠️ WARNING: % column(s) could not be added. Check errors above.', missing_count;
  END IF;
END $$;
