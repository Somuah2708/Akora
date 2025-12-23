-- Fix Storage Bucket Permissions for Circle Posts Images
-- Run this in your Supabase SQL Editor

-- 1. Make sure the chat-media bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-media', 'chat-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop any restrictive policies that might block access
DROP POLICY IF EXISTS "Public read access for chat media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat media" ON storage.objects;

-- 3. Create permissive policies for the chat-media bucket

-- Allow anyone to view files (needed for public URLs to work)
CREATE POLICY "Public read access for chat media"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-media');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media');

-- Allow users to update their own files
CREATE POLICY "Users can update their own chat media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'chat-media');

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own chat media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Verify bucket is public
SELECT id, name, public FROM storage.buckets WHERE id = 'chat-media';
