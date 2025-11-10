-- ========================================
-- COPY AND RUN THIS ENTIRE FILE IN SUPABASE SQL EDITOR
-- ========================================
-- This will fix all your like and comment count issues

-- Step 1: Add count columns to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Step 2: Update all existing posts with accurate counts RIGHT NOW
UPDATE public.posts p
SET comments_count = (SELECT COUNT(*) FROM public.post_comments c WHERE c.post_id = p.id),
    likes_count = (SELECT COUNT(*) FROM public.post_likes l WHERE l.post_id = p.id);

-- Step 3: Create function to auto-update comment count
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

-- Step 4: Create trigger for comment count
DROP TRIGGER IF EXISTS trigger_update_post_comment_count ON public.post_comments;
CREATE TRIGGER trigger_update_post_comment_count
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- Step 5: Create function to auto-update like count
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

-- Step 6: Create trigger for like count
DROP TRIGGER IF EXISTS trigger_update_post_like_count ON public.post_likes;
CREATE TRIGGER trigger_update_post_like_count
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

-- Step 7: VERIFY COUNTS ARE NOW CORRECT
-- This will show you the actual vs stored counts
SELECT 
  p.id,
  p.comments_count as stored_comments,
  (SELECT COUNT(*) FROM public.post_comments c WHERE c.post_id = p.id) as actual_comments,
  p.likes_count as stored_likes,
  (SELECT COUNT(*) FROM public.post_likes l WHERE l.post_id = p.id) as actual_likes,
  CASE 
    WHEN p.comments_count = (SELECT COUNT(*) FROM public.post_comments c WHERE c.post_id = p.id) 
    THEN '✅' ELSE '❌' 
  END as comments_match,
  CASE 
    WHEN p.likes_count = (SELECT COUNT(*) FROM public.post_likes l WHERE l.post_id = p.id) 
    THEN '✅' ELSE '❌' 
  END as likes_match
FROM public.posts p
ORDER BY p.created_at DESC
LIMIT 10;

-- ========================================
-- SUCCESS!
-- ========================================
-- After running this:
-- 1. Refresh your app
-- 2. Check if counts are now accurate
-- 3. Add a new comment - count should update immediately
-- 4. Like a post - count should update immediately
