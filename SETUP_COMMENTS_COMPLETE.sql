-- SETUP COMMENTS FOR OAA SECRETARIAT ANNOUNCEMENTS
-- This script will check if tables exist and create them if needed

-- ============================================================================
-- STEP 1: Check if main announcements table exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'secretariat_announcements'
  ) THEN
    RAISE EXCEPTION 'ERROR: secretariat_announcements table does not exist! Please run CREATE_SECRETARIAT_ANNOUNCEMENTS_TABLE.sql first';
  ELSE
    RAISE NOTICE '✓ secretariat_announcements table exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create announcement_comments table if it doesn't exist
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.announcement_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  announcement_id UUID NOT NULL REFERENCES public.secretariat_announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Comment content
  content TEXT NOT NULL,
  
  -- Reply system (optional - for threaded comments)
  parent_comment_id UUID REFERENCES public.announcement_comments(id) ON DELETE CASCADE,
  
  -- Moderation
  is_approved BOOLEAN DEFAULT true,
  is_flagged BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_content_length CHECK (length(content) > 0 AND length(content) <= 1000)
);

-- ============================================================================
-- STEP 3: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_announcement_comments_announcement_id 
ON public.announcement_comments(announcement_id);

CREATE INDEX IF NOT EXISTS idx_announcement_comments_user_id 
ON public.announcement_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_announcement_comments_parent_id 
ON public.announcement_comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_announcement_comments_created_at 
ON public.announcement_comments(created_at DESC);

-- ============================================================================
-- STEP 3.5: Add like_count column if it doesn't exist
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'announcement_comments' 
    AND column_name = 'like_count'
  ) THEN
    ALTER TABLE public.announcement_comments ADD COLUMN like_count INTEGER DEFAULT 0;
    RAISE NOTICE '✓ Added like_count column to announcement_comments';
  ELSE
    RAISE NOTICE '✓ like_count column already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Enable RLS and create policies
-- ============================================================================

ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view all comments" ON public.announcement_comments;
DROP POLICY IF EXISTS "Users can view approved comments" ON public.announcement_comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.announcement_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.announcement_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.announcement_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.announcement_comments;

-- Create new policies
CREATE POLICY "Users can view all comments"
  ON public.announcement_comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON public.announcement_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.announcement_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.announcement_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 5: Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_comments TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- STEP 6: Create comment likes table (for like functionality)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.announcement_comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES public.announcement_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one like per user per comment
  UNIQUE(comment_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_announcement_comment_likes_comment_id 
ON public.announcement_comment_likes(comment_id);

CREATE INDEX IF NOT EXISTS idx_announcement_comment_likes_user_id 
ON public.announcement_comment_likes(user_id);

-- ============================================================================
-- STEP 7: Enable RLS for comment likes
-- ============================================================================

ALTER TABLE public.announcement_comment_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all comment likes" ON public.announcement_comment_likes;
DROP POLICY IF EXISTS "Users can like comments" ON public.announcement_comment_likes;
DROP POLICY IF EXISTS "Users can unlike their own comment likes" ON public.announcement_comment_likes;

-- Create policies
CREATE POLICY "Users can view all comment likes"
ON public.announcement_comment_likes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can like comments"
ON public.announcement_comment_likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own comment likes"
ON public.announcement_comment_likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.announcement_comment_likes TO authenticated;

-- ============================================================================
-- STEP 8: Create trigger function for comment like count
-- ============================================================================

CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.announcement_comments
    SET like_count = like_count + 1
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.announcement_comments
    SET like_count = GREATEST(0, like_count - 1)
    WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_comment_like_count ON public.announcement_comment_likes;
CREATE TRIGGER trigger_update_comment_like_count
AFTER INSERT OR DELETE ON public.announcement_comment_likes
FOR EACH ROW
EXECUTE FUNCTION update_comment_like_count();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_comment_like_count() TO authenticated;

-- ============================================================================
-- STEP 9: Create trigger function for announcement comment count
-- ============================================================================

CREATE OR REPLACE FUNCTION update_announcement_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.secretariat_announcements
    SET comment_count = comment_count + 1
    WHERE id = NEW.announcement_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.secretariat_announcements
    SET comment_count = GREATEST(0, comment_count - 1)
    WHERE id = OLD.announcement_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_announcement_comment_count ON public.announcement_comments;
CREATE TRIGGER trigger_update_announcement_comment_count
AFTER INSERT OR DELETE ON public.announcement_comments
FOR EACH ROW
EXECUTE FUNCTION update_announcement_comment_count();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_announcement_comment_count() TO authenticated;

-- ============================================================================
-- STEP 10: Add table comments
-- ============================================================================

COMMENT ON TABLE public.announcement_comments IS 'Stores comments on OAA Secretariat announcements';
COMMENT ON TABLE public.announcement_comment_likes IS 'Stores likes on announcement comments';
COMMENT ON COLUMN public.announcement_comments.content IS 'The comment text content';
COMMENT ON COLUMN public.announcement_comments.like_count IS 'Number of likes on this comment';

-- ============================================================================
-- STEP 11: Verification
-- ============================================================================

DO $$
DECLARE
  comment_count INTEGER;
  like_table_exists BOOLEAN;
BEGIN
  -- Check announcement_comments
  SELECT COUNT(*) INTO comment_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'announcement_comments';
  
  IF comment_count > 0 THEN
    RAISE NOTICE '✓ announcement_comments table created successfully';
  ELSE
    RAISE NOTICE '✗ announcement_comments table creation failed';
  END IF;
  
  -- Check announcement_comment_likes
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'announcement_comment_likes'
  ) INTO like_table_exists;
  
  IF like_table_exists THEN
    RAISE NOTICE '✓ announcement_comment_likes table created successfully';
  ELSE
    RAISE NOTICE '✗ announcement_comment_likes table creation failed';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'SETUP COMPLETE!';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Users can now:';
  RAISE NOTICE '  ✓ Post comments on announcements';
  RAISE NOTICE '  ✓ View all comments';
  RAISE NOTICE '  ✓ Like/unlike comments';
  RAISE NOTICE '  ✓ Delete their own comments';
  RAISE NOTICE '=================================================';
END $$;
