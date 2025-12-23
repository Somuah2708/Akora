-- Add comment threading and likes support for circle post comments
-- Run this in Supabase SQL Editor

-- Add parent_comment_id column for reply threading
ALTER TABLE circle_post_comments 
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES circle_post_comments(id) ON DELETE CASCADE;

-- Add like_count column for comment likes
ALTER TABLE circle_post_comments 
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Create circle_post_comment_likes table
CREATE TABLE IF NOT EXISTS circle_post_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES circle_post_comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

-- Enable RLS
ALTER TABLE circle_post_comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for circle_post_comment_likes
CREATE POLICY "Users can view comment likes" 
  ON circle_post_comment_likes FOR SELECT 
  USING (true);

CREATE POLICY "Users can like comments" 
  ON circle_post_comment_likes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes" 
  ON circle_post_comment_likes FOR DELETE 
  USING (auth.uid() = user_id);

-- Function to update like count
CREATE OR REPLACE FUNCTION update_circle_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE circle_post_comments 
    SET like_count = COALESCE(like_count, 0) + 1 
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE circle_post_comments 
    SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) 
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_circle_comment_like_count_trigger ON circle_post_comment_likes;

CREATE TRIGGER update_circle_comment_like_count_trigger
  AFTER INSERT OR DELETE ON circle_post_comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_circle_comment_like_count();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_circle_post_comments_parent 
  ON circle_post_comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_circle_post_comment_likes_comment 
  ON circle_post_comment_likes(comment_id);

CREATE INDEX IF NOT EXISTS idx_circle_post_comment_likes_user 
  ON circle_post_comment_likes(user_id);

-- Verify the changes
SELECT 'circle_post_comments columns:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'circle_post_comments'
ORDER BY ordinal_position;

SELECT 'circle_post_comment_likes table exists:' as info, 
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'circle_post_comment_likes') as exists;
