-- Fix Storage Access for Circle Posts Media
-- Run this in your Supabase SQL Editor if images/videos are not displaying

-- 1. Ensure chat-media bucket is PUBLIC (this is crucial!)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'chat-media';

-- 2. Drop ALL existing policies for chat-media to start fresh
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage'
        AND policyname LIKE '%chat%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_name);
    END LOOP;
END $$;

-- 3. Create simple, permissive policies

-- CRITICAL: Allow ANYONE to read files from chat-media (makes public URLs work)
CREATE POLICY "Anyone can view chat-media files"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-media');

-- Allow authenticated users to upload to chat-media
CREATE POLICY "Authenticated users can upload to chat-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media');

-- Allow authenticated users to update files in chat-media
CREATE POLICY "Authenticated users can update chat-media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-media');

-- Allow authenticated users to delete from chat-media  
CREATE POLICY "Authenticated users can delete from chat-media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-media');

-- 4. Verify the bucket is now public
SELECT 
    id, 
    name, 
    public,
    CASE WHEN public THEN '✅ Public - URLs should work' ELSE '❌ NOT Public - URLs will fail!' END as status
FROM storage.buckets 
WHERE id = 'chat-media';

-- 5. Check that SELECT policy exists
SELECT policyname, permissive, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%chat%';
