-- DIAGNOSTIC: Check why media files are not accessible
-- Run this in Supabase SQL Editor and share the results

-- 1. Check if bucket exists and its settings
SELECT 
    id, 
    name, 
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'chat-media';

-- 2. Check ALL policies on storage.objects
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;

-- 3. Check if there are any files in the bucket
SELECT 
    name,
    bucket_id,
    created_at,
    metadata
FROM storage.objects 
WHERE bucket_id = 'chat-media'
ORDER BY created_at DESC
LIMIT 10;

-- 4. FORCE the bucket to be public (run this!)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'chat-media';

-- 5. If the bucket doesn't exist, create it
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-media', 
    'chat-media', 
    true, 
    104857600,  -- 100MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'video/webm', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 104857600;

-- 6. Drop ALL storage policies and recreate simple ones
DROP POLICY IF EXISTS "Anyone can view chat-media files" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for chat media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to chat-media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own chat media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update chat-media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from chat-media" ON storage.objects;

-- 7. Create the simplest possible SELECT policy (CRITICAL for public URLs)
CREATE POLICY "public_read_chat_media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-media');

-- 8. Create upload policy for authenticated users
CREATE POLICY "auth_insert_chat_media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media');

-- 9. Create update policy
CREATE POLICY "auth_update_chat_media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-media');

-- 10. Create delete policy
CREATE POLICY "auth_delete_chat_media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-media');

-- 11. Final verification
SELECT '=== BUCKET STATUS ===' as info;
SELECT id, name, public FROM storage.buckets WHERE id = 'chat-media';

SELECT '=== POLICIES ===' as info;
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
AND (policyname LIKE '%chat%' OR policyname LIKE '%public%');

SELECT '=== RECENT FILES ===' as info;
SELECT name, created_at FROM storage.objects 
WHERE bucket_id = 'chat-media' 
ORDER BY created_at DESC LIMIT 5;
