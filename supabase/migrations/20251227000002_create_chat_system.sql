/*
  # Complete Chat System Setup
  
  This migration creates all tables needed for a fully functional chat system.
  
  Tables:
  1. chats - Chat conversations (direct and group)
  2. chat_participants - Users participating in chats
  3. messages - Chat messages
  
  Features:
  - Direct messaging (1-on-1)
  - Group chats
  - Real-time message subscriptions
  - Helper function to get or create direct chats
  - Unread message tracking
*/

-- =====================================================
-- 1. CHATS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('direct', 'group')),
  name text, -- Name for group chats (null for direct chats)
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_chats_type ON public.chats(type);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON public.chats(created_at DESC);

-- Enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. CHAT PARTICIPANTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON public.chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON public.chat_participants(user_id);

-- Enable RLS
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_deleted boolean DEFAULT false
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON public.messages(chat_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS POLICIES (After all tables are created)
-- =====================================================

-- Chats policies
CREATE POLICY "Users can view chats they participate in"
  ON public.chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create group chats"
  ON public.chats FOR INSERT
  WITH CHECK (type = 'group');

CREATE POLICY "Group chat participants can update chat details"
  ON public.chats FOR UPDATE
  USING (
    type = 'group' AND
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_id = id AND user_id = auth.uid()
    )
  );

-- Chat participants policies
CREATE POLICY "Users can view participants in their chats"
  ON public.chat_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = chat_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join group chats"
  ON public.chat_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE id = chat_id AND type = 'group'
    )
  );

CREATE POLICY "Users can leave chats"
  ON public.chat_participants FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
  ON public.chat_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in their chats"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_id = messages.chat_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their chats"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_id = messages.chat_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages"
  ON public.messages FOR DELETE
  USING (auth.uid() = sender_id);

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to get or create a direct chat between two users
CREATE OR REPLACE FUNCTION public.get_or_create_direct_chat(
  user1_id uuid,
  user2_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  chat_id uuid;
BEGIN
  -- Check if a direct chat already exists between these users
  SELECT c.id INTO chat_id
  FROM public.chats c
  WHERE c.type = 'direct'
    AND EXISTS (
      SELECT 1 FROM public.chat_participants cp1
      WHERE cp1.chat_id = c.id AND cp1.user_id = user1_id
    )
    AND EXISTS (
      SELECT 1 FROM public.chat_participants cp2
      WHERE cp2.chat_id = c.id AND cp2.user_id = user2_id
    )
    AND (
      SELECT COUNT(*) FROM public.chat_participants cp
      WHERE cp.chat_id = c.id
    ) = 2
  LIMIT 1;

  -- If no chat exists, create one
  IF chat_id IS NULL THEN
    -- Create the chat
    INSERT INTO public.chats (type)
    VALUES ('direct')
    RETURNING id INTO chat_id;

    -- Add both participants
    INSERT INTO public.chat_participants (chat_id, user_id)
    VALUES (chat_id, user1_id), (chat_id, user2_id);
  END IF;

  RETURN chat_id;
END;
$$;

-- Function to get unread message count for a user in a chat
CREATE OR REPLACE FUNCTION public.get_unread_count(
  p_chat_id uuid,
  p_user_id uuid
)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)
  FROM public.messages m
  WHERE m.chat_id = p_chat_id
    AND m.sender_id != p_user_id
    AND m.created_at > (
      SELECT COALESCE(last_read_at, '1970-01-01'::timestamptz)
      FROM public.chat_participants
      WHERE chat_id = p_chat_id AND user_id = p_user_id
    );
$$;

-- Function to mark chat as read
CREATE OR REPLACE FUNCTION public.mark_chat_as_read(
  p_chat_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.chat_participants
  SET last_read_at = now()
  WHERE chat_id = p_chat_id AND user_id = p_user_id;
END;
$$;

-- Function to get latest message for each chat
CREATE OR REPLACE FUNCTION public.get_latest_message(p_chat_id uuid)
RETURNS TABLE (
  id uuid,
  content text,
  sender_id uuid,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id, content, sender_id, created_at
  FROM public.messages
  WHERE chat_id = p_chat_id
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- =====================================================
-- 6. TRIGGERS
-- =====================================================

-- Trigger to update chat's updated_at when a new message is sent
CREATE OR REPLACE FUNCTION public.update_chat_timestamp()
RETURNS trigger AS $$
BEGIN
  UPDATE public.chats
  SET updated_at = NEW.created_at
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_timestamp();

-- =====================================================
-- 7. INSERT SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample chats (only if chats table is empty)
DO $$
DECLARE
  user1_id uuid := '00000000-0000-0000-0000-000000000001';
  user2_id uuid := '00000000-0000-0000-0000-000000000002';
  user3_id uuid := '00000000-0000-0000-0000-000000000003';
  chat1_id uuid;
  chat2_id uuid;
  chat3_id uuid;
BEGIN
  -- Check if profiles exist (from previous migration)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id IN (user1_id, user2_id, user3_id)) THEN
    
    -- Only create sample chats if chats table is empty
    IF NOT EXISTS (SELECT 1 FROM public.chats LIMIT 1) THEN
      
      -- Create direct chat between John and Jane
      INSERT INTO public.chats (type) VALUES ('direct') RETURNING id INTO chat1_id;
      INSERT INTO public.chat_participants (chat_id, user_id) VALUES (chat1_id, user1_id), (chat1_id, user2_id);
      
      -- Create direct chat between John and Alex
      INSERT INTO public.chats (type) VALUES ('direct') RETURNING id INTO chat2_id;
      INSERT INTO public.chat_participants (chat_id, user_id) VALUES (chat2_id, user1_id), (chat2_id, user3_id);
      
      -- Create group chat
      INSERT INTO public.chats (type, name, avatar_url) 
      VALUES ('group', 'Creative Team', 'https://i.pravatar.cc/150?img=10') 
      RETURNING id INTO chat3_id;
      INSERT INTO public.chat_participants (chat_id, user_id) 
      VALUES (chat3_id, user1_id), (chat3_id, user2_id), (chat3_id, user3_id);
      
      -- Insert sample messages with realistic conversation flow
      INSERT INTO public.messages (chat_id, sender_id, content, created_at) VALUES
        -- John and Jane conversation (Direct Chat)
        (chat1_id, user1_id, 'Hey Jane! How are you?', now() - interval '2 days'),
        (chat1_id, user2_id, 'Hi John! I''m doing great, just finished a new art piece 🎨', now() - interval '2 days' + interval '5 minutes'),
        (chat1_id, user1_id, 'That''s awesome! Would love to see it', now() - interval '2 days' + interval '10 minutes'),
        (chat1_id, user2_id, 'I''ll send you some photos soon!', now() - interval '2 days' + interval '15 minutes'),
        (chat1_id, user1_id, 'Can''t wait! Are you going to the alumni meet next week?', now() - interval '1 day'),
        (chat1_id, user2_id, 'Yes! I''m planning to attend. Will you be there?', now() - interval '1 day' + interval '30 minutes'),
        (chat1_id, user1_id, 'Absolutely! Let''s catch up there', now() - interval '1 day' + interval '45 minutes'),
        (chat1_id, user2_id, 'Perfect! See you then 😊', now() - interval '1 day' + interval '50 minutes'),
        (chat1_id, user1_id, 'By the way, I saw your latest post. The artwork is stunning!', now() - interval '5 hours'),
        (chat1_id, user2_id, 'Thank you so much! That means a lot coming from you', now() - interval '4 hours'),
        (chat1_id, user1_id, 'You''re really talented! Keep creating 🎨✨', now() - interval '3 hours'),
        (chat1_id, user2_id, 'You''re too kind! How''s your photography project going?', now() - interval '2 hours'),
        (chat1_id, user1_id, 'Making progress! Got some amazing shots at the beach yesterday', now() - interval '1 hour'),
        (chat1_id, user2_id, 'Ooh share them! I love your photography style', now() - interval '30 minutes'),
        (chat1_id, user1_id, 'Will do! I''ll post some today', now() - interval '15 minutes'),
        
        -- John and Alex conversation (Direct Chat - Food Discussion)
        (chat2_id, user3_id, 'John, have you tried that new restaurant downtown?', now() - interval '3 days'),
        (chat2_id, user1_id, 'Not yet! Is it good?', now() - interval '3 days' + interval '20 minutes'),
        (chat2_id, user3_id, 'Amazing! Best pasta I''ve had in months 🍝', now() - interval '3 days' + interval '25 minutes'),
        (chat2_id, user1_id, 'That''s high praise coming from you! What did you order?', now() - interval '3 days' + interval '30 minutes'),
        (chat2_id, user3_id, 'The truffle carbonara - absolutely divine!', now() - interval '3 days' + interval '35 minutes'),
        (chat2_id, user1_id, 'Now you''re making me hungry 😅', now() - interval '2 days'),
        (chat2_id, user3_id, 'Haha we should go together sometime!', now() - interval '2 days' + interval '10 minutes'),
        (chat2_id, user1_id, 'Definitely! How about this weekend?', now() - interval '2 days' + interval '15 minutes'),
        (chat2_id, user3_id, 'Perfect! I''ll make a reservation for Saturday evening', now() - interval '2 days' + interval '20 minutes'),
        (chat2_id, user1_id, 'Awesome! Looking forward to it', now() - interval '2 days' + interval '25 minutes'),
        (chat2_id, user3_id, 'Me too! I have so many food pics to share with you 📸', now() - interval '1 day'),
        (chat2_id, user1_id, 'Your food blog is seriously impressive btw', now() - interval '1 day' + interval '30 minutes'),
        (chat2_id, user3_id, 'Thanks! It''s been a fun journey. Any tips for better food photography?', now() - interval '12 hours'),
        (chat2_id, user1_id, 'Natural lighting is key! Also try shooting from different angles', now() - interval '10 hours'),
        (chat2_id, user3_id, 'Good tips! I''ll experiment with that', now() - interval '8 hours'),
        
        -- Group chat (Creative Team)
        (chat3_id, user1_id, 'Hey everyone! Welcome to the creative team chat', now() - interval '4 days'),
        (chat3_id, user2_id, 'Thanks for creating this! Excited to collaborate', now() - interval '4 days' + interval '10 minutes'),
        (chat3_id, user3_id, 'Looking forward to working with you all! 🙌', now() - interval '4 days' + interval '15 minutes'),
        (chat3_id, user1_id, 'Let''s plan a meetup soon to brainstorm ideas', now() - interval '4 days' + interval '30 minutes'),
        (chat3_id, user2_id, 'Great idea! I''m free next Wednesday afternoon', now() - interval '3 days'),
        (chat3_id, user3_id, 'Works for me! Where should we meet?', now() - interval '3 days' + interval '20 minutes'),
        (chat3_id, user1_id, 'How about the Innovation Hub? They have good meeting spaces', now() - interval '3 days' + interval '25 minutes'),
        (chat3_id, user2_id, 'Perfect! I can bring some concept sketches', now() - interval '3 days' + interval '30 minutes'),
        (chat3_id, user3_id, 'And I''ll bring snacks! 🍰☕', now() - interval '3 days' + interval '35 minutes'),
        (chat3_id, user1_id, 'You''re the best Alex! 😄', now() - interval '2 days'),
        (chat3_id, user2_id, 'Quick question: what''s our main project goal?', now() - interval '2 days' + interval '2 hours'),
        (chat3_id, user1_id, 'Creating a visual campaign for the upcoming alumni event', now() - interval '2 days' + interval '2 hours 10 minutes'),
        (chat3_id, user3_id, 'Sounds exciting! I can help with social media content', now() - interval '2 days' + interval '2 hours 15 minutes'),
        (chat3_id, user2_id, 'And I''ll handle the visual design and graphics', now() - interval '2 days' + interval '2 hours 20 minutes'),
        (chat3_id, user1_id, 'Perfect team! Photography and documentation covered on my end', now() - interval '1 day'),
        (chat3_id, user3_id, 'This is going to be amazing! ✨', now() - interval '1 day' + interval '30 minutes'),
        (chat3_id, user2_id, 'Can''t wait to get started!', now() - interval '1 day' + interval '40 minutes'),
        (chat3_id, user1_id, 'See you all Wednesday at 2pm then!', now() - interval '12 hours'),
        (chat3_id, user3_id, 'See you there! 👋', now() - interval '11 hours'),
        (chat3_id, user2_id, 'Looking forward to it!', now() - interval '10 hours'),
        (chat3_id, user1_id, 'Just shared the meeting agenda in the docs', now() - interval '3 hours'),
        (chat3_id, user2_id, 'Got it! Looks comprehensive', now() - interval '2 hours'),
        (chat3_id, user3_id, 'Perfect! I''ll review it tonight', now() - interval '1 hour');
    END IF;
  END IF;
END $$;

-- =====================================================
