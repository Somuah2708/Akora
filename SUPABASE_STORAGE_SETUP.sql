-- ============================================
-- SUPABASE STORAGE CONFIGURATION FOR LARGE FILES
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Update existing buckets to allow larger files (100MB limit)
UPDATE storage.buckets
SET file_size_limit = 104857600  -- 100MB in bytes (100 * 1024 * 1024)
WHERE id IN ('media', 'post-media');

-- 2. Create post-media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,  -- Public access
  104857600,  -- 100MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']
)
ON CONFLICT (id) DO UPDATE
SET 
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];

-- 3. Create media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,  -- Public access
  104857600,  -- 100MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']
)
ON CONFLICT (id) DO UPDATE
SET 
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];

-- 4. Set up RLS policies for authenticated uploads to post-media bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads to post-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to post-media" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own post-media" ON storage.objects;

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads to post-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-media');

-- Allow public read access
CREATE POLICY "Allow public read access to post-media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-media');

-- Allow users to delete their own files
CREATE POLICY "Allow users to delete their own post-media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 5. Set up RLS policies for authenticated uploads to media bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads to media" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to media" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own media" ON storage.objects;

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads to media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- Allow public read access
CREATE POLICY "Allow public read access to media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- Allow users to delete their own files
CREATE POLICY "Allow users to delete their own media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 6. Verify configuration
SELECT 
  id,
  name,
  public,
  file_size_limit,
  file_size_limit / 1024 / 1024 as size_limit_mb,
  allowed_mime_types
FROM storage.buckets
WHERE id IN ('media', 'post-media');

-- ============================================
-- EXPECTED OUTPUT:
-- 
-- id          | name       | public | file_size_limit | size_limit_mb | allowed_mime_types
-- ------------|------------|--------|-----------------|---------------|--------------------
-- media       | media      | true   | 104857600       | 100           | {image/jpeg, ...}
-- post-media  | post-media | true   | 104857600       | 100           | {image/jpeg, ...}
--
-- ============================================

-- NOTES:
-- 1. 100MB is a good balance between quality and upload speed
-- 2. Client-side compression reduces most images to < 2MB
-- 3. Videos are uploaded as-is (most phones compress efficiently)
-- 4. For larger files (>100MB), consider:
--    - Increasing file_size_limit to 200MB or 500MB
--    - Implementing server-side video compression
--    - Using a CDN for video delivery
-- ============================================
