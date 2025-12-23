-- Fix avatars bucket to allow circle avatar uploads
-- The bucket exists but RLS policies need to be updated to allow uploads to circles/ folder

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
DROP POLICY IF EXISTS "Avatar authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatar owner update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar owner delete" ON storage.objects;

-- Create comprehensive policies for avatars bucket

-- 1. Anyone can view avatars (public read)
CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 2. Authenticated users can upload to their own folder OR circles folder
CREATE POLICY "avatars_authenticated_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (
    -- User uploading to their own folder
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- User uploading to circles folder (any authenticated user can create a circle)
    (storage.foldername(name))[1] = 'circles'
  )
);

-- 3. Users can update their own avatars or circle avatars they uploaded
CREATE POLICY "avatars_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    (storage.foldername(name))[1] = 'circles'
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    (storage.foldername(name))[1] = 'circles'
  )
);

-- 4. Users can delete their own avatars or circle avatars
CREATE POLICY "avatars_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    (storage.foldername(name))[1] = 'circles'
  )
);

-- Verify the policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE 'avatars%';
