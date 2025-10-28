-- Create storage bucket for chat media (images, videos, voice messages)
-- This migration sets up the storage infrastructure for media messages

-- Create the storage bucket
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
    'audio/mp4'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for chat media
-- Allow authenticated users to upload their own media
CREATE POLICY "Users can upload their own media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media' AND
  (storage.foldername(name))[1] = 'messages' AND
  (storage.foldername(name))[3] = auth.uid()::text
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
  bucket_id = 'chat-media' AND
  (storage.foldername(name))[3] = auth.uid()::text
);
