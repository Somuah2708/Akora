-- Add image_urls array column to posts table for multiple images support
-- This was missing from the original schema

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS image_urls TEXT[];

COMMENT ON COLUMN posts.image_urls IS 'Array of image URLs for carousel (multiple images support)';
