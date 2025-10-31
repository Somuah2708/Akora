-- Fix get_discover_posts function to remove video_url column reference
-- Run this migration to fix the RPC function

DROP FUNCTION IF EXISTS get_discover_posts(UUID, INT, INT);

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

COMMENT ON FUNCTION get_discover_posts IS 'Returns posts visible to user based on friendships and interests (fixed - removed video_url)';
