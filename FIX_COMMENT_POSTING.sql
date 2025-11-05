-- Fix comment posting issues for OAA Secretariat Announcements
-- Run this SQL in Supabase SQL Editor to allow users to post and view comments

-- First, verify the announcement_comments table exists
-- If it doesn't exist, you need to run CREATE_SECRETARIAT_ANNOUNCEMENTS_TABLE.sql first

-- Grant necessary permissions for comments
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_comments TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Update RLS policies to allow viewing all comments (not just approved)
DROP POLICY IF EXISTS "Users can view approved comments" ON public.announcement_comments;
DROP POLICY IF EXISTS "Users can view all comments" ON public.announcement_comments;

CREATE POLICY "Users can view all comments"
  ON public.announcement_comments
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure users can insert comments
DROP POLICY IF EXISTS "Users can create comments" ON public.announcement_comments;

CREATE POLICY "Users can create comments"
  ON public.announcement_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Ensure users can update their own comments
DROP POLICY IF EXISTS "Users can update own comments" ON public.announcement_comments;

CREATE POLICY "Users can update own comments"
  ON public.announcement_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure users can delete their own comments
DROP POLICY IF EXISTS "Users can delete own comments" ON public.announcement_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.announcement_comments;

CREATE POLICY "Users can delete own comments"
  ON public.announcement_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Ensure comment likes table has proper permissions (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'announcement_comment_likes') THEN
    GRANT SELECT, INSERT, DELETE ON public.announcement_comment_likes TO authenticated;
  END IF;
END $$;

-- Grant execute permissions on functions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_comment_like_count') THEN
    GRANT EXECUTE ON FUNCTION update_comment_like_count() TO authenticated;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_announcement_comment_count') THEN
    GRANT EXECUTE ON FUNCTION update_announcement_comment_count() TO authenticated;
  END IF;
END $$;

-- Verify table structure and show any issues
DO $$
DECLARE
  table_exists boolean;
  content_col_exists boolean;
BEGIN
  -- Check if announcement_comments table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'announcement_comments'
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    RAISE NOTICE 'ERROR: announcement_comments table does not exist!';
    RAISE NOTICE 'Please run CREATE_SECRETARIAT_ANNOUNCEMENTS_TABLE.sql first';
  ELSE
    RAISE NOTICE 'SUCCESS: announcement_comments table exists';
    
    -- Check if content column exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'announcement_comments'
      AND column_name = 'content'
    ) INTO content_col_exists;
    
    IF content_col_exists THEN
      RAISE NOTICE 'SUCCESS: content column exists';
    ELSE
      RAISE NOTICE 'ERROR: content column does not exist!';
    END IF;
  END IF;
END $$;
