-- =====================================================
-- MASTER MARKETPLACE SETUP - RUN THIS FIRST
-- Complete setup for Tonaton/Jiji marketplace clone
-- =====================================================
-- Run this ENTIRE file in Supabase SQL Editor in ONE go
-- This will set up EVERYTHING needed for the marketplace

BEGIN;

-- ============================================
-- PART 1: ADD DATABASE COLUMNS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PART 1: Adding marketplace columns...';
  RAISE NOTICE '========================================';
END $$;

-- Add contact and location columns
DO $$
BEGIN
  -- Contact phone column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE products_services ADD COLUMN contact_phone TEXT;
    RAISE NOTICE '  ✓ Added contact_phone';
  END IF;

  -- Contact WhatsApp column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'contact_whatsapp'
  ) THEN
    ALTER TABLE products_services ADD COLUMN contact_whatsapp TEXT;
    RAISE NOTICE '  ✓ Added contact_whatsapp';
  END IF;

  -- Location city column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'location_city'
  ) THEN
    ALTER TABLE products_services ADD COLUMN location_city TEXT;
    RAISE NOTICE '  ✓ Added location_city';
  END IF;

  -- Location region column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'location_region'
  ) THEN
    ALTER TABLE products_services ADD COLUMN location_region TEXT;
    RAISE NOTICE '  ✓ Added location_region';
  END IF;

  -- Region ID foreign key column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'region_id'
  ) THEN
    ALTER TABLE products_services ADD COLUMN region_id UUID;
    RAISE NOTICE '  ✓ Added region_id';
  END IF;

  -- City ID foreign key column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'city_id'
  ) THEN
    ALTER TABLE products_services ADD COLUMN city_id UUID;
    RAISE NOTICE '  ✓ Added city_id';
  END IF;

  -- Listing type column (product/service)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'type'
  ) THEN
    ALTER TABLE products_services ADD COLUMN type TEXT CHECK (type IN ('product', 'service'));
    RAISE NOTICE '  ✓ Added type';
  END IF;

  -- Image URLs array for multiple images
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'image_urls'
  ) THEN
    ALTER TABLE products_services ADD COLUMN image_urls TEXT[];
    RAISE NOTICE '  ✓ Added image_urls';
  END IF;

  -- General location column (fallback for legacy data)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_services' AND column_name = 'location'
  ) THEN
    ALTER TABLE products_services ADD COLUMN location TEXT;
    RAISE NOTICE '  ✓ Added location';
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_products_services_location_city ON products_services(location_city);
CREATE INDEX IF NOT EXISTS idx_products_services_location_region ON products_services(location_region);
CREATE INDEX IF NOT EXISTS idx_products_services_region_id ON products_services(region_id);
CREATE INDEX IF NOT EXISTS idx_products_services_city_id ON products_services(city_id);
CREATE INDEX IF NOT EXISTS idx_products_services_type ON products_services(type);

DO $$
BEGIN
  RAISE NOTICE '  ✓ Created indexes for performance';
  RAISE NOTICE '';
  RAISE NOTICE '✅ PART 1 COMPLETE: Database columns added';
END $$;

-- ============================================
-- PART 2: CREATE STORAGE BUCKET
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PART 2: Creating storage bucket...';
  RAISE NOTICE '========================================';
END $$;

-- Create the product-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images', 
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']::text[];

-- Drop existing policies
DROP POLICY IF EXISTS "Public read access for product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own product images" ON storage.objects;

-- Create policies
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Users can update own product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

CREATE POLICY "Users can delete own product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

DO $$
BEGIN
  RAISE NOTICE '  ✓ Created product-images bucket';
  RAISE NOTICE '  ✓ Bucket is PUBLIC (anyone can view)';
  RAISE NOTICE '  ✓ 5MB file size limit';
  RAISE NOTICE '  ✓ Storage policies configured';
  RAISE NOTICE '';
  RAISE NOTICE '✅ PART 2 COMPLETE: Storage bucket ready';
END $$;

COMMIT;

-- ============================================
-- FINAL VERIFICATION
-- ============================================

DO $$
DECLARE
  col_count INT;
  bucket_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION';
  RAISE NOTICE '========================================';
  
  -- Check columns
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns 
  WHERE table_name = 'products_services' 
  AND column_name IN (
    'contact_phone', 'contact_whatsapp', 
    'location_city', 'location_region', 
    'region_id', 'city_id', 'type', 'image_urls', 'location'
  );
  
  RAISE NOTICE 'Database Columns: % / 9', col_count;
  
  -- Check bucket
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'product-images'
  ) INTO bucket_exists;
  
  IF bucket_exists THEN
    RAISE NOTICE 'Storage Bucket: ✓ EXISTS';
  ELSE
    RAISE NOTICE 'Storage Bucket: ✗ MISSING';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 MARKETPLACE SETUP COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ TODO: Reload your app now';
  RAISE NOTICE '   1. In terminal: Press R to reload';
  RAISE NOTICE '   2. OR shake phone → tap "Reload"';
  RAISE NOTICE '';
  RAISE NOTICE '✅ TEST: Create your first listing';
  RAISE NOTICE '   1. Go to Marketplace';
  RAISE NOTICE '   2. Tap + button';
  RAISE NOTICE '   3. Upload images';
  RAISE NOTICE '   4. Fill details';
  RAISE NOTICE '   5. Post listing';
  RAISE NOTICE '';
  RAISE NOTICE '📖 OPTIONAL: Run CREATE_LOCATIONS_SYSTEM.sql';
  RAISE NOTICE '   for dynamic Ghana regions/cities';
  RAISE NOTICE '';
END $$;
