-- ================================================
-- IMPORTANT: Run this SQL in your Supabase Dashboard
-- ================================================
-- This migration creates the post_likes table for tracking post likes
-- ================================================

-- Step 1: Create post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id) -- Each user can only like a post once
);

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS post_likes_user_id_idx ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS post_likes_created_at_idx ON post_likes(created_at DESC);

-- Step 3: Enable Row Level Security
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies

-- Anyone can view likes
CREATE POLICY "Anyone can view likes"
ON post_likes FOR SELECT
USING (true);

-- Authenticated users can create likes
CREATE POLICY "Authenticated users can create likes"
ON post_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own likes
CREATE POLICY "Users can delete own likes"
ON post_likes FOR DELETE
USING (auth.uid() = user_id);

-- Step 5: Create function to get likes count for a post
CREATE OR REPLACE FUNCTION get_post_likes_count(p_post_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM post_likes
    WHERE post_id = p_post_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 6: Create function to check if user liked a post
CREATE OR REPLACE FUNCTION user_liked_post(p_post_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM post_likes
    WHERE post_id = p_post_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 7: Verify the table was created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'post_likes') as column_count
FROM information_schema.tables 
WHERE table_name = 'post_likes';

-- ================================================
-- After running this, you should see:
-- table_name  | column_count
-- post_likes  | 4
-- ================================================
