-- ========================================
-- MIXED MEDIA CAROUSEL SUPPORT
-- ========================================
-- This allows posts to have mixed images and videos in a single carousel
-- (Just like Instagram - you can have 3 videos and 2 images in one post)

-- Add new column to support mixed media
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS media_items JSONB DEFAULT NULL;

-- The media_items column will store an array like:
-- [
--   { "type": "image", "url": "https://..." },
--   { "type": "video", "url": "https://..." },
--   { "type": "image", "url": "https://..." }
-- ]

-- This allows any order of images and videos in a single post carousel

-- Note: Keep image_urls and video_urls for backward compatibility
-- New posts with mixed media will use media_items
-- Old posts will continue using image_urls/video_urls

-- ========================================
-- USAGE
-- ========================================
-- When creating a post with mixed media:
-- INSERT INTO posts (user_id, content, media_items) VALUES (
--   'user-id',
--   'Check out my mixed media post!',
--   '[{"type":"video","url":"https://..."},{"type":"image","url":"https://..."}]'::jsonb
-- );
