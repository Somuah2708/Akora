-- Fix RLS policies for circle-post-images bucket
-- Run this in Supabase SQL Editor

-- 1. Make sure bucket is public and configured correctly
UPDATE storage.buckets 
SET 
    public = true,
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY[
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic',
        'video/mp4', 'video/quicktime', 'video/webm',
        'application/pdf'
    ]
WHERE id = 'circle-post-images';

-- 2. Drop existing restrictive policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload circle post images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view circle post images" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can upload circle post images" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can delete circle post images" ON storage.objects;

-- 3. Create permissive policies for circle-post-images

-- Allow anyone to view (required for public URLs)
CREATE POLICY "circle_post_images_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'circle-post-images');

-- Allow authenticated users to upload
CREATE POLICY "circle_post_images_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'circle-post-images');

-- Allow authenticated users to update
CREATE POLICY "circle_post_images_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'circle-post-images');

-- Allow authenticated users to delete
CREATE POLICY "circle_post_images_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'circle-post-images');

-- 4. Verify
SELECT 'Bucket:' as info, id, public FROM storage.buckets WHERE id = 'circle-post-images';
SELECT 'Policies:' as info, policyname, cmd FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage' 
AND policyname LIKE 'circle_post%';
