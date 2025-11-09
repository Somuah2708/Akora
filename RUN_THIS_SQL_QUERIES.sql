-- ========================================
-- QUICK START: Run These Queries in Order
-- ========================================
-- Copy each section below and run in Supabase SQL Editor
-- Run them one at a time and wait for success before moving to the next

-- ========================================
-- STEP 1: Create Comment Likes Table
-- ========================================
-- This enables persistent comment likes

CREATE TABLE IF NOT EXISTS public.post_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.post_comments 
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_post_comment_likes_comment_id 
ON public.post_comment_likes(comment_id);

CREATE INDEX IF NOT EXISTS idx_post_comment_likes_user_id 
ON public.post_comment_likes(user_id);

CREATE OR REPLACE FUNCTION update_post_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post_comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_comments SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_post_comment_like_count ON public.post_comment_likes;
CREATE TRIGGER trigger_update_post_comment_like_count
AFTER INSERT OR DELETE ON public.post_comment_likes
FOR EACH ROW EXECUTE FUNCTION update_post_comment_like_count();

ALTER TABLE public.post_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all comment likes" ON public.post_comment_likes
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can like comments" ON public.post_comment_likes
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own comment likes" ON public.post_comment_likes
FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON public.post_comment_likes TO authenticated;

-- ========================================
-- STEP 2: Add Comment and Like Count Columns
-- ========================================
-- This enables accurate counts with automatic triggers

ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Recalculate existing counts
UPDATE public.posts p
SET comments_count = (SELECT COUNT(*) FROM public.post_comments c WHERE c.post_id = p.id);

UPDATE public.posts p
SET likes_count = (SELECT COUNT(*) FROM public.post_likes l WHERE l.post_id = p.id);

-- Create comment count trigger
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_post_comment_count ON public.post_comments;
CREATE TRIGGER trigger_update_post_comment_count
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- Create like count trigger
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_post_like_count ON public.post_likes;
CREATE TRIGGER trigger_update_post_like_count
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

-- ========================================
-- STEP 3: Verify Everything Works
-- ========================================
-- Run these queries to check your setup

-- Check tables and columns exist
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('post_comments', 'post_comment_likes', 'posts')
  AND column_name IN ('like_count', 'comments_count', 'likes_count')
ORDER BY table_name, column_name;

-- Check triggers are active
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%comment%' OR trigger_name LIKE '%like%'
ORDER BY trigger_name;

-- Check sample counts (should all be accurate)
SELECT 
  p.id,
  p.comments_count as stored_comments,
  (SELECT COUNT(*) FROM public.post_comments c WHERE c.post_id = p.id) as actual_comments,
  p.likes_count as stored_likes,
  (SELECT COUNT(*) FROM public.post_likes l WHERE l.post_id = p.id) as actual_likes
FROM public.posts p
LIMIT 5;

-- ========================================
-- SUCCESS!
-- ========================================
-- If all queries ran successfully:
-- ✅ Comment likes will now persist
-- ✅ Comment counts will be accurate
-- ✅ Like counts will be accurate
-- ✅ Everything updates automatically with triggers
--
-- Now test in your app:
-- 1. Like a comment → Refresh → Should still be liked
-- 2. Add a comment → Count should update immediately
-- 3. Like a post → Count should persist after refresh
