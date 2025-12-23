-- Add attachments column to circle_posts for document sharing
-- Run this in your Supabase SQL Editor

-- Add the attachments column as JSONB to store array of attachment objects
ALTER TABLE circle_posts 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN circle_posts.attachments IS 'JSON array of attachments with url, name, and type properties';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'circle_posts' AND column_name = 'attachments';
