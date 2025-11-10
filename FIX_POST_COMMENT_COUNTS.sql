-- Fix inaccurate comment counts in posts table
-- This ensures the comments_count column accurately reflects the actual number of comments

-- First, add comments_count column if it doesn't exist
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- Update all posts with accurate comment counts
UPDATE public.posts p
SET comments_count = (
  SELECT COUNT(*)
  FROM public.post_comments c
  WHERE c.post_id = p.id
);

-- Create function to automatically update comment count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment count
DROP TRIGGER IF EXISTS trigger_update_post_comment_count ON public.post_comments;
CREATE TRIGGER trigger_update_post_comment_count
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION update_post_comment_count();

-- Also update the like counts in posts to ensure accuracy
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Update all posts with accurate like counts
UPDATE public.posts p
SET likes_count = (
  SELECT COUNT(*)
  FROM public.post_likes l
  WHERE l.post_id = p.id
);

-- Create function to automatically update like count
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for like count
DROP TRIGGER IF EXISTS trigger_update_post_like_count ON public.post_likes;
CREATE TRIGGER trigger_update_post_like_count
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW
EXECUTE FUNCTION update_post_like_count();

-- Verify the counts
SELECT 
  p.id,
  p.comments_count as stored_count,
  (SELECT COUNT(*) FROM public.post_comments c WHERE c.post_id = p.id) as actual_count,
  p.likes_count as stored_likes,
  (SELECT COUNT(*) FROM public.post_likes l WHERE l.post_id = p.id) as actual_likes
FROM public.posts p
WHERE p.comments_count != (SELECT COUNT(*) FROM public.post_comments c WHERE c.post_id = p.id)
   OR p.likes_count != (SELECT COUNT(*) FROM public.post_likes l WHERE l.post_id = p.id)
LIMIT 10;
