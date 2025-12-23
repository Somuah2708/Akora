-- Update circle-post-images bucket to allow videos and documents
-- Run this in Supabase SQL Editor

-- Update bucket to allow video and document mime types
UPDATE storage.buckets 
SET 
    public = true,
    file_size_limit = 104857600,  -- 100MB for videos
    allowed_mime_types = ARRAY[
        'image/jpeg', 
        'image/png', 
        'image/gif', 
        'image/webp', 
        'image/heic',
        'video/mp4', 
        'video/quicktime', 
        'video/webm',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
WHERE id = 'circle-post-images';

-- Verify
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'circle-post-images';
