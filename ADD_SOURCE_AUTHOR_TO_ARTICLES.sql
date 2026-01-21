-- Add source_author column to trending_articles table for proper attribution
-- Run this migration in your Supabase SQL Editor

-- Add source_author column if it doesn't exist
ALTER TABLE trending_articles 
ADD COLUMN IF NOT EXISTS source_author TEXT;

-- Add source_name column if it doesn't exist (in case it's also missing)
ALTER TABLE trending_articles 
ADD COLUMN IF NOT EXISTS source_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN trending_articles.source_author IS 'Name of the original author for attribution';
COMMENT ON COLUMN trending_articles.source_name IS 'Name of the source publication for attribution';
