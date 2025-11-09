-- ============================================
-- Storage Policies for post-media bucket (ADMIN-ONLY UPLOADS)
-- ============================================
-- 
-- Run this AFTER creating the bucket manually in Supabase Dashboard
-- Bucket should be created with: name='post-media', public=true
--
-- These policies ensure:
-- 1. Anyone can VIEW files (public bucket)
-- 2. Only ADMINS can UPLOAD files (is_admin = true OR role = 'admin')
-- 3. Only ADMINS can UPDATE their own files
-- 4. Only ADMINS can DELETE their own files
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view post-media files" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can upload post-media files" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can update their own post-media files" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can delete their own post-media files" ON storage.objects;

-- Policy 1: Anyone can view files in post-media bucket (public bucket)
CREATE POLICY "Anyone can view post-media files"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-media');

-- Policy 2: Only ADMINS can upload files to post-media bucket
CREATE POLICY "Only admins can upload post-media files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post-media' 
  AND auth.role() = 'authenticated'
  AND (
    -- Check if user is admin in profiles table
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role = 'admin')
    )
  )
);

-- Policy 3: Only ADMINS can update their own post-media files
CREATE POLICY "Only admins can update their own post-media files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'post-media' 
  AND auth.uid() = owner
  AND (
    -- Check if user is admin in profiles table
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role = 'admin')
    )
  )
)
WITH CHECK (
  bucket_id = 'post-media' 
  AND auth.uid() = owner
  AND (
    -- Check if user is admin in profiles table
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role = 'admin')
    )
  )
);

-- Policy 4: Only ADMINS can delete their own post-media files
CREATE POLICY "Only admins can delete their own post-media files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'post-media' 
  AND auth.uid() = owner
  AND (
    -- Check if user is admin in profiles table
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role = 'admin')
    )
  )
);

-- Verify bucket exists and policies were created
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE id = 'post-media';

-- Check policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%post-media%';
