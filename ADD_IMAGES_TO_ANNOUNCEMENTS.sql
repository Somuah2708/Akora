-- Migration: Add images column to secretariat_announcements table
-- Run this in Supabase SQL Editor if you already have the announcements table created

-- Add images column to support multiple images (up to 20)
ALTER TABLE public.secretariat_announcements 
ADD COLUMN IF NOT EXISTS images JSONB;

-- Add comment to explain the column structure
COMMENT ON COLUMN public.secretariat_announcements.images IS 'Array of image objects: [{url: string, caption?: string}]';

-- The image_url column is kept for backward compatibility and will be used as the featured image
-- When images array exists, images[0].url should be synced with image_url for compatibility
