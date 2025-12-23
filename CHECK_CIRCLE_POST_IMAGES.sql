-- Check if file exists and bucket access
-- Run in Supabase SQL Editor

-- 1. Check if the specific file exists
SELECT name, bucket_id, created_at, metadata
FROM storage.objects 
WHERE bucket_id = 'circle-post-images'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check bucket settings
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id = 'circle-post-images';

-- 3. Check ALL policies for this bucket
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- 4. Grant anon access (critical for public URLs)
GRANT USAGE ON SCHEMA storage TO anon;
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.buckets TO anon;

-- 5. Ensure bucket is public
UPDATE storage.buckets SET public = true WHERE id = 'circle-post-images';
