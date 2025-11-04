-- Create announcement_comment_likes table
-- This table stores likes on comments for announcements

CREATE TABLE IF NOT EXISTS public.announcement_comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES public.announcement_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one like per user per comment
  UNIQUE(comment_id, user_id)
);

-- Add like_count to announcement_comments table
ALTER TABLE public.announcement_comments 
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_announcement_comment_likes_comment_id 
ON public.announcement_comment_likes(comment_id);

CREATE INDEX IF NOT EXISTS idx_announcement_comment_likes_user_id 
ON public.announcement_comment_likes(user_id);

-- Function to update comment like count
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

-- Create trigger for comment like count
DROP TRIGGER IF EXISTS trigger_update_comment_like_count ON public.announcement_comment_likes;
CREATE TRIGGER trigger_update_comment_like_count
AFTER INSERT OR DELETE ON public.announcement_comment_likes
FOR EACH ROW
EXECUTE FUNCTION update_comment_like_count();

-- Enable RLS
ALTER TABLE public.announcement_comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcement_comment_likes
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

-- Update RLS policy for announcement_comments to allow deletion
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.announcement_comments;
CREATE POLICY "Users can delete their own comments"
ON public.announcement_comments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

GRANT DELETE ON public.announcement_comments TO authenticated;

COMMENT ON TABLE public.announcement_comment_likes IS 'Stores likes on announcement comments';
COMMENT ON COLUMN public.announcement_comments.like_count IS 'Number of likes on this comment';
