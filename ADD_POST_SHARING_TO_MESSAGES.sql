-- Add columns to support post sharing in messages (Instagram-style)
-- This allows messages to contain shared posts with rich previews

-- Add message_type column to distinguish between text, post, image, etc.
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'post', 'image', 'video'));

-- Add post_id column to reference shared posts
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL;

-- Add index for querying messages by post
CREATE INDEX IF NOT EXISTS idx_messages_post_id ON public.messages(post_id);

-- Add index for querying messages by type
CREATE INDEX IF NOT EXISTS idx_messages_type ON public.messages(message_type);

COMMENT ON COLUMN public.messages.message_type IS 'Type of message: text (regular message), post (shared post), image, video';
COMMENT ON COLUMN public.messages.post_id IS 'Reference to shared post for message_type = post';
