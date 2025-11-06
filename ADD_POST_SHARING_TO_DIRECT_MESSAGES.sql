-- Add post sharing support to direct_messages table (for backward compatibility)

-- Add message_type column to direct_messages
ALTER TABLE public.direct_messages 
ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'post', 'image', 'video', 'voice', 'document'));

-- Add post_id column to direct_messages
ALTER TABLE public.direct_messages 
ADD COLUMN IF NOT EXISTS post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_direct_messages_post_id ON public.direct_messages(post_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_type ON public.direct_messages(message_type);

COMMENT ON COLUMN public.direct_messages.message_type IS 'Type of message: text, post (shared post), image, video, voice, document';
COMMENT ON COLUMN public.direct_messages.post_id IS 'Reference to shared post for message_type = post';
