-- Add videos column to circle_posts for video sharing
-- Run this in your Supabase SQL Editor

-- Add the videos column as TEXT[] to store array of video URLs (similar to images)
ALTER TABLE circle_posts 
ADD COLUMN IF NOT EXISTS videos TEXT[] DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN circle_posts.videos IS 'Array of video URLs for the post';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'circle_posts' AND column_name IN ('images', 'videos', 'attachments');
