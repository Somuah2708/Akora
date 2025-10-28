-- ============================================
-- CRITICAL: Run this SQL in your Supabase SQL Editor
-- ============================================
-- This creates the storage bucket for chat media
-- Go to: Supabase Dashboard > SQL Editor > New Query > Paste & Run

-- Step 1: Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'audio/m4a',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'audio/m4a',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav'
  ];

-- Step 2: Set up storage policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own media" ON storage.objects;
DROP POLICY IF EXISTS "Chat media is publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;

-- Allow authenticated users to upload their own media
CREATE POLICY "Users can upload their own media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
);

-- Allow users to read all chat media (since it's public)
CREATE POLICY "Chat media is publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-media');

-- Allow users to delete their own media
CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media'
);

-- Step 3: Verify the bucket was created
SELECT * FROM storage.buckets WHERE id = 'chat-media';
