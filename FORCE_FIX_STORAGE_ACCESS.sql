-- FORCE FIX: Enable anonymous access to storage
-- This ensures the 'anon' role can read from public buckets

-- Grant usage on storage schema to anon
GRANT USAGE ON SCHEMA storage TO anon;

-- Grant select on storage.objects to anon
GRANT SELECT ON storage.objects TO anon;

-- Grant select on storage.buckets to anon  
GRANT SELECT ON storage.buckets TO anon;

-- Ensure the bucket is definitely public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'chat-media';

-- Drop and recreate the SELECT policy with explicit anon role
DROP POLICY IF EXISTS "public_read_chat_media" ON storage.objects;
DROP POLICY IF EXISTS "anon_read_chat_media" ON storage.objects;

-- Create policy that explicitly allows anon role
CREATE POLICY "anon_read_chat_media"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'chat-media');

-- Verify
SELECT 'Bucket public status:' as check, public FROM storage.buckets WHERE id = 'chat-media';

SELECT 'SELECT policies:' as check, policyname, roles 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage' 
AND cmd = 'SELECT';
