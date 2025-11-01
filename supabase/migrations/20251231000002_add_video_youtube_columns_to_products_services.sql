-- Add video and YouTube columns to products_services table
-- This migration adds support for multiple videos and YouTube embeds in listings

-- Add columns for local videos
ALTER TABLE products_services
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_urls TEXT[]; -- Array for multiple videos

-- Add columns for YouTube videos
ALTER TABLE products_services
ADD COLUMN IF NOT EXISTS youtube_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_urls TEXT[]; -- Array for multiple YouTube videos

-- Add comments for documentation
COMMENT ON COLUMN products_services.video_url IS 'Single video URL (uploaded to storage)';
COMMENT ON COLUMN products_services.video_urls IS 'Array of video URLs for carousel (uploaded to storage)';
COMMENT ON COLUMN products_services.youtube_url IS 'Single YouTube video URL';
COMMENT ON COLUMN products_services.youtube_urls IS 'Array of YouTube video URLs for carousel';
