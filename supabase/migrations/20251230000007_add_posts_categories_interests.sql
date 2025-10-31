-- ================================================
-- Add user interests and post categories
-- ================================================
-- This migration adds support for:
-- 1. Post categories/aspects of life
-- 2. User interests/preferences
-- 3. Friend-only post visibility
-- ================================================

-- Step 1: Add category and visibility fields to posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN (
  'general',
  'education',
  'career',
  'health',
  'fitness',
  'mental_health',
  'finance',
  'relationships',
  'hobbies',
  'travel',
  'technology',
  'entrepreneurship',
  'spirituality',
  'sports',
  'arts',
  'music',
  'other'
)),
ADD COLUMN IF NOT EXISTS visibility TEXT CHECK (visibility IN ('public', 'friends_only', 'private')) DEFAULT 'friends_only';

-- Step 2: Create user_interests table to store what aspects users are interested in
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'education',
    'career',
    'health',
    'fitness',
    'mental_health',
    'finance',
    'relationships',
    'hobbies',
    'travel',
    'technology',
    'entrepreneurship',
    'spirituality',
    'sports',
    'arts',
    'music'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- Step 3: Add RLS policies for user_interests
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

-- Users can view their own interests
CREATE POLICY "Users can view own interests"
  ON user_interests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own interests
CREATE POLICY "Users can insert own interests"
  ON user_interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own interests
CREATE POLICY "Users can delete own interests"
  ON user_interests FOR DELETE
  USING (auth.uid() = user_id);

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_category ON user_interests(category);

-- Step 5: Create a function to get posts visible to a user (friends' posts + interest-based)
CREATE OR REPLACE FUNCTION get_discover_posts(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  image_url TEXT,
  video_url TEXT,
  category TEXT,
  visibility TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.content,
    p.image_url,
    p.video_url,
    p.category,
    p.visibility,
    p.created_at
  FROM posts p
  WHERE 
    -- Show posts where:
    (
      -- 1. User is friends with post author (bidirectional friendship)
      (p.visibility = 'friends_only' AND (
        EXISTS (
          SELECT 1 FROM friends f 
          WHERE (f.user_id = p_user_id AND f.friend_id = p.user_id)
             OR (f.friend_id = p_user_id AND f.user_id = p.user_id)
        )
      ))
      OR
      -- 2. Post is public
      p.visibility = 'public'
      OR
      -- 3. User's own posts
      p.user_id = p_user_id
    )
    AND
    -- Filter by user's interests if they have any
    (
      p.category IS NULL
      OR p.category = 'general'
      OR EXISTS (
        SELECT 1 FROM user_interests ui
        WHERE ui.user_id = p_user_id
        AND ui.category = p.category
      )
      OR p.user_id = p_user_id  -- Always show own posts
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Add comments for documentation
COMMENT ON TABLE user_interests IS 'Stores user preferences for content categories/aspects of life';
COMMENT ON COLUMN posts.category IS 'Category/aspect of life this post relates to';
COMMENT ON COLUMN posts.visibility IS 'Who can see this post: public, friends_only, or private';
COMMENT ON FUNCTION get_discover_posts IS 'Returns posts visible to user based on friendships and interests';

-- Verification query
SELECT 
  column_name, 
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name IN ('posts', 'user_interests')
ORDER BY table_name, ordinal_position;
