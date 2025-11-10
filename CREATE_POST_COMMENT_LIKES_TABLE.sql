-- Create post_comment_likes table
-- This table stores likes on comments for posts

CREATE TABLE IF NOT EXISTS public.post_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one like per user per comment
  UNIQUE(comment_id, user_id)
);

-- Add like_count to post_comments table
ALTER TABLE public.post_comments 
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_post_comment_likes_comment_id 
ON public.post_comment_likes(comment_id);

CREATE INDEX IF NOT EXISTS idx_post_comment_likes_user_id 
ON public.post_comment_likes(user_id);

-- Function to update comment like count
CREATE OR REPLACE FUNCTION update_post_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post_comments
    SET like_count = like_count + 1
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_comments
    SET like_count = GREATEST(0, like_count - 1)
    WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for comment like count
DROP TRIGGER IF EXISTS trigger_update_post_comment_like_count ON public.post_comment_likes;
CREATE TRIGGER trigger_update_post_comment_like_count
AFTER INSERT OR DELETE ON public.post_comment_likes
FOR EACH ROW
EXECUTE FUNCTION update_post_comment_like_count();

-- Enable RLS
ALTER TABLE public.post_comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_comment_likes
CREATE POLICY "Users can view all comment likes"
ON public.post_comment_likes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can like comments"
ON public.post_comment_likes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own comment likes"
ON public.post_comment_likes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.post_comment_likes TO authenticated;

COMMENT ON TABLE public.post_comment_likes IS 'Stores likes on post comments';
COMMENT ON COLUMN public.post_comments.like_count IS 'Number of likes on this comment';
