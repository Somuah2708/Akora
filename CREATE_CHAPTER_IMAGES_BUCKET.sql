-- ============================================
-- CRITICAL: Run this SQL in your Supabase SQL Editor
-- ============================================
-- This creates the storage bucket for chapter images/gallery
-- Go to: Supabase Dashboard > SQL Editor > New Query > Paste & Run

-- Step 1: Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chapter-images',
  'chapter-images',
  true,
  10485760, -- 10MB limit per image
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

-- Step 2: Set up storage policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload chapter images" ON storage.objects;
DROP POLICY IF EXISTS "Chapter images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chapter images" ON storage.objects;
DROP POLICY IF EXISTS "Chapter creators can update their images" ON storage.objects;

-- Allow authenticated users to upload chapter images
CREATE POLICY "Authenticated users can upload chapter images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chapter-images'
);

-- Allow everyone to view chapter images (public bucket)
CREATE POLICY "Chapter images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chapter-images');

-- Allow authenticated users to delete their own chapter images
CREATE POLICY "Users can delete their own chapter images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chapter-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own chapter images
CREATE POLICY "Chapter creators can update their images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chapter-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Step 3: Verify the bucket was created
SELECT * FROM storage.buckets WHERE id = 'chapter-images';

-- Step 4: Verify policies are in place
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'objects' 
  AND policyname LIKE '%chapter%'
ORDER BY policyname;
