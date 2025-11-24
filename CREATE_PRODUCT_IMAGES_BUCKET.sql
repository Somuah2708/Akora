-- =====================================================
-- CREATE PRODUCT IMAGES STORAGE BUCKET
-- Run this in Supabase SQL Editor NOW
-- =====================================================
-- This creates the storage bucket for marketplace product/service images

-- Create the product-images bucket (public for anyone to view)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images', 
  true,  -- Public bucket so images can be viewed by anyone
  5242880,  -- 5MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']::text[];

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own product images" ON storage.objects;

-- Policy 1: Public read access (anyone can view product images)
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Policy 2: Authenticated users can upload images
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND (storage.foldername(name))[1] = 'products'
);

-- Policy 3: Users can update their own images
CREATE POLICY "Users can update own product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND auth.uid()::text = (storage.foldername(name))[2]
)
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Policy 4: Users can delete their own images
CREATE POLICY "Users can delete own product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Verify bucket was created
SELECT 
  id, 
  name, 
  public,
  file_size_limit / 1024 / 1024 as size_limit_mb,
  allowed_mime_types
FROM storage.buckets 
WHERE name = 'product-images';

-- List all policies for this bucket
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%product images%';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ SUCCESS: Product images storage bucket created!';
  RAISE NOTICE '';
  RAISE NOTICE '📦 Bucket Configuration:';
  RAISE NOTICE '   • Name: product-images';
  RAISE NOTICE '   • Public: ✓ YES (anyone can view)';
  RAISE NOTICE '   • Size Limit: 5MB per file';
  RAISE NOTICE '   • Allowed Types: JPEG, PNG, JPG, WebP';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Security Policies:';
  RAISE NOTICE '   ✓ Public read access';
  RAISE NOTICE '   ✓ Authenticated upload (logged-in users only)';
  RAISE NOTICE '   ✓ Users can update their own images';
  RAISE NOTICE '   ✓ Users can delete their own images';
  RAISE NOTICE '';
  RAISE NOTICE '📂 File Structure:';
  RAISE NOTICE '   product-images/products/{user_id}/{filename}';
  RAISE NOTICE '';
  RAISE NOTICE '✅ NEXT STEPS:';
  RAISE NOTICE '1. Reload your app (press R in Metro terminal)';
  RAISE NOTICE '2. Navigate to Marketplace → + Create Listing';
  RAISE NOTICE '3. Upload 1-3 images';
  RAISE NOTICE '4. Fill in listing details';
  RAISE NOTICE '5. Tap "Post Listing"';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Your Tonaton/Jiji marketplace is ready!';
END $$;
