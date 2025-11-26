-- Create admin_messages table for direct admin-user communication
-- Users can message admins directly without friend requests

CREATE TABLE IF NOT EXISTS public.admin_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_conversations table to track conversation metadata
CREATE TABLE IF NOT EXISTS public.admin_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_admin_count INTEGER DEFAULT 0,
  unread_user_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_messages

-- Users can view their own messages
CREATE POLICY "Users can view their own messages"
  ON public.admin_messages
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
  ON public.admin_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can send messages
CREATE POLICY "Users can send messages"
  ON public.admin_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND sender_type = 'user');

-- Admins can send messages to any user
CREATE POLICY "Admins can send messages to users"
  ON public.admin_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_type = 'admin' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can update their own messages
CREATE POLICY "Users can update their messages"
  ON public.admin_messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can update all messages
CREATE POLICY "Admins can update all messages"
  ON public.admin_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for admin_conversations

-- Users can view their own conversation
CREATE POLICY "Users can view their own conversation"
  ON public.admin_conversations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all conversations
CREATE POLICY "Admins can view all conversations"
  ON public.admin_conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can insert their own conversation
CREATE POLICY "Users can insert their conversation"
  ON public.admin_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can insert any conversation
CREATE POLICY "Admins can insert any conversation"
  ON public.admin_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can update their own conversation
CREATE POLICY "Users can update their conversation"
  ON public.admin_conversations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can update all conversations
CREATE POLICY "Admins can update all conversations"
  ON public.admin_conversations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX idx_admin_messages_user_id ON public.admin_messages(user_id);
CREATE INDEX idx_admin_messages_created_at ON public.admin_messages(created_at DESC);
CREATE INDEX idx_admin_conversations_user_id ON public.admin_conversations(user_id);
CREATE INDEX idx_admin_conversations_last_message_at ON public.admin_conversations(last_message_at DESC);

-- Create function to update conversation on new message
CREATE OR REPLACE FUNCTION update_admin_conversation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_conversations (user_id, last_message, last_message_at, unread_admin_count, unread_user_count)
  VALUES (
    NEW.user_id,
    NEW.message,
    NEW.created_at,
    CASE WHEN NEW.sender_type = 'user' THEN 1 ELSE 0 END,
    CASE WHEN NEW.sender_type = 'admin' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    last_message = NEW.message,
    last_message_at = NEW.created_at,
    unread_admin_count = CASE 
      WHEN NEW.sender_type = 'user' THEN admin_conversations.unread_admin_count + 1 
      ELSE admin_conversations.unread_admin_count 
    END,
    unread_user_count = CASE 
      WHEN NEW.sender_type = 'admin' THEN admin_conversations.unread_user_count + 1 
      ELSE admin_conversations.unread_user_count 
    END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_admin_conversation ON public.admin_messages;
CREATE TRIGGER trigger_update_admin_conversation
  AFTER INSERT ON public.admin_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_conversation();

-- Add comments
COMMENT ON TABLE public.admin_messages IS 'Direct messages between users and admins';
COMMENT ON TABLE public.admin_conversations IS 'Conversation metadata for admin chats';
