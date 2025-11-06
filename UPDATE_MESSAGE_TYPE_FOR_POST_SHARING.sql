-- Add 'post' message type to direct_messages and group_messages
-- This allows Instagram-style post sharing in chats

-- Drop existing constraints
ALTER TABLE direct_messages DROP CONSTRAINT IF EXISTS direct_messages_message_type_check;
ALTER TABLE group_messages DROP CONSTRAINT IF EXISTS group_messages_message_type_check;

-- Add new constraints with 'post' type
ALTER TABLE direct_messages 
ADD CONSTRAINT direct_messages_message_type_check 
CHECK (message_type IN ('text', 'image', 'video', 'voice', 'document', 'post'));

ALTER TABLE group_messages 
ADD CONSTRAINT group_messages_message_type_check 
CHECK (message_type IN ('text', 'image', 'video', 'voice', 'document', 'post'));

-- Add post_id column to direct_messages if it doesn't exist
ALTER TABLE public.direct_messages 
ADD COLUMN IF NOT EXISTS post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL;

-- Add post_id column to group_messages if it doesn't exist
ALTER TABLE public.group_messages 
ADD COLUMN IF NOT EXISTS post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_direct_messages_post_id ON public.direct_messages(post_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_post_id ON public.group_messages(post_id);

-- Add comments
COMMENT ON COLUMN public.direct_messages.post_id IS 'Reference to shared post for message_type = post (Instagram-style sharing)';
COMMENT ON COLUMN public.group_messages.post_id IS 'Reference to shared post for message_type = post (Instagram-style sharing)';
