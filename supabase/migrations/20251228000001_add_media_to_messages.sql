-- Add media support to direct_messages table
-- This migration adds fields for media messages (images, videos, voice notes)

-- Add new columns to direct_messages table
ALTER TABLE direct_messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'voice'));

ALTER TABLE direct_messages 
ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Add index for faster queries on message type
CREATE INDEX IF NOT EXISTS idx_direct_messages_message_type ON direct_messages(message_type);

-- Update existing messages to have 'text' type
UPDATE direct_messages SET message_type = 'text' WHERE message_type IS NULL;
