-- Add video and YouTube columns to posts table
-- This migration adds support for multiple videos and YouTube embeds

-- Add columns for local videos
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_urls TEXT[]; -- Array for multiple videos

-- Add columns for YouTube videos
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS youtube_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_urls TEXT[]; -- Array for multiple YouTube videos

-- Add comments for documentation
COMMENT ON COLUMN posts.video_url IS 'Single video URL (uploaded to storage)';
COMMENT ON COLUMN posts.video_urls IS 'Array of video URLs for carousel (uploaded to storage)';
COMMENT ON COLUMN posts.youtube_url IS 'Single YouTube video URL';
COMMENT ON COLUMN posts.youtube_urls IS 'Array of YouTube video URLs for carousel';
