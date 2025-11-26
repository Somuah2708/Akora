-- Add media support to admin_messages table
-- Allows users to send images and documents in admin chat

ALTER TABLE public.admin_messages
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('image', 'document'));

-- Create index for media queries
CREATE INDEX IF NOT EXISTS idx_admin_messages_media ON public.admin_messages(media_type) WHERE media_url IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.admin_messages.media_url IS 'URL to uploaded media (image or document)';
COMMENT ON COLUMN public.admin_messages.media_type IS 'Type of media: image or document';
