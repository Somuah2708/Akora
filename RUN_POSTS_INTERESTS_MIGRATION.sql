-- ================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- ================================================
-- This adds post categories, user interests, and friend-only visibility
-- ================================================

-- Step 1: Add category and visibility to posts
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN (
  'general', 'education', 'career', 'health', 'fitness', 'mental_health',
  'finance', 'relationships', 'hobbies', 'travel', 'technology',
  'entrepreneurship', 'spirituality', 'sports', 'arts', 'music', 'other'
)),
ADD COLUMN IF NOT EXISTS visibility TEXT CHECK (visibility IN ('public', 'friends_only', 'private')) DEFAULT 'friends_only';

-- Step 2: Create user_interests table
CREATE TABLE IF NOT EXISTS user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'education', 'career', 'health', 'fitness', 'mental_health', 'finance',
    'relationships', 'hobbies', 'travel', 'technology', 'entrepreneurship',
    'spirituality', 'sports', 'arts', 'music'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- Step 3: Enable RLS on user_interests
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interests"
  ON user_interests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interests"
  ON user_interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own interests"
  ON user_interests FOR DELETE
  USING (auth.uid() = user_id);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_category ON user_interests(category);

-- Step 5: Create function to get personalized discover feed
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
    (
      (p.visibility = 'friends_only' AND (
        EXISTS (
          SELECT 1 FROM friends f 
          WHERE (f.user_id = p_user_id AND f.friend_id = p.user_id)
             OR (f.friend_id = p_user_id AND f.user_id = p.user_id)
        )
      ))
      OR p.visibility = 'public'
      OR p.user_id = p_user_id
    )
    AND
    (
      p.category IS NULL
      OR p.category = 'general'
      OR EXISTS (
        SELECT 1 FROM user_interests ui
        WHERE ui.user_id = p_user_id
        AND ui.category = p.category
      )
      OR p.user_id = p_user_id
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification
SELECT 'Migration completed successfully!' AS status;
