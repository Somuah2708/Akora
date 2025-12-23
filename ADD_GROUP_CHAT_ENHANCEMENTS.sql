-- ============================================================
-- GROUP CHAT ENHANCEMENTS
-- Adds: Reply to messages, Reactions, Message editing/deletion
-- Run this migration in Supabase SQL Editor
-- ============================================================

-- 1. Add reply_to column for message threading
ALTER TABLE public.group_messages
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.group_messages(id) ON DELETE SET NULL;

-- 2. Add is_edited and is_deleted flags
ALTER TABLE public.group_messages
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;

ALTER TABLE public.group_messages
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

ALTER TABLE public.group_messages
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

ALTER TABLE public.group_messages
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 3. Create message reactions table
CREATE TABLE IF NOT EXISTS public.group_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_messages_reply_to ON public.group_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_group_message_reactions_message ON public.group_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_group_message_reactions_user ON public.group_message_reactions(user_id);

-- 5. Enable RLS on reactions table
ALTER TABLE public.group_message_reactions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for reactions
-- Members can view reactions on messages in their groups
DROP POLICY IF EXISTS "Members can view reactions" ON public.group_message_reactions;
CREATE POLICY "Members can view reactions"
ON public.group_message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_messages gm
    JOIN public.group_members mem ON mem.group_id = gm.group_id
    WHERE gm.id = message_id AND mem.user_id = auth.uid()
  )
);

-- Users can add reactions to messages in groups they're members of
DROP POLICY IF EXISTS "Members can add reactions" ON public.group_message_reactions;
CREATE POLICY "Members can add reactions"
ON public.group_message_reactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.group_messages gm
    JOIN public.group_members mem ON mem.group_id = gm.group_id
    WHERE gm.id = message_id AND mem.user_id = auth.uid()
  )
);

-- Users can remove their own reactions
DROP POLICY IF EXISTS "Users can remove own reactions" ON public.group_message_reactions;
CREATE POLICY "Users can remove own reactions"
ON public.group_message_reactions FOR DELETE
USING (auth.uid() = user_id);

-- 7. Add policy for message editing (only sender can edit)
DROP POLICY IF EXISTS "Sender can update own messages" ON public.group_messages;
CREATE POLICY "Sender can update own messages"
ON public.group_messages FOR UPDATE
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- 8. Function to get reactions for a message (aggregated)
CREATE OR REPLACE FUNCTION public.get_message_reactions(p_message_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'emoji', emoji,
      'count', count,
      'users', users
    )
  ) INTO result
  FROM (
    SELECT 
      emoji,
      COUNT(*) as count,
      json_agg(json_build_object('id', r.user_id, 'name', p.full_name)) as users
    FROM public.group_message_reactions r
    JOIN public.profiles p ON p.id = r.user_id
    WHERE r.message_id = p_message_id
    GROUP BY emoji
    ORDER BY count DESC
  ) sub;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_message_reactions(UUID) TO authenticated;

-- 9. Function to toggle reaction (add if not exists, remove if exists)
CREATE OR REPLACE FUNCTION public.toggle_message_reaction(
  p_message_id UUID,
  p_emoji TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
  v_user_id UUID := auth.uid();
BEGIN
  -- Check if reaction exists
  SELECT EXISTS(
    SELECT 1 FROM public.group_message_reactions
    WHERE message_id = p_message_id AND user_id = v_user_id AND emoji = p_emoji
  ) INTO v_exists;
  
  IF v_exists THEN
    -- Remove reaction
    DELETE FROM public.group_message_reactions
    WHERE message_id = p_message_id AND user_id = v_user_id AND emoji = p_emoji;
    RETURN false; -- Reaction removed
  ELSE
    -- Add reaction
    INSERT INTO public.group_message_reactions (message_id, user_id, emoji)
    VALUES (p_message_id, v_user_id, p_emoji);
    RETURN true; -- Reaction added
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_message_reaction(UUID, TEXT) TO authenticated;

-- 10. Realtime is already enabled for all tables via supabase_realtime publication
-- No action needed - group_message_reactions will automatically be included

-- ============================================================
-- VERIFICATION
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Group chat enhancements migration complete!';
  RAISE NOTICE '   - Added reply_to_id column for message threading';
  RAISE NOTICE '   - Added is_edited, edited_at columns';
  RAISE NOTICE '   - Added is_deleted, deleted_at columns';
  RAISE NOTICE '   - Created group_message_reactions table';
  RAISE NOTICE '   - Created get_message_reactions function';
  RAISE NOTICE '   - Created toggle_message_reaction function';
  RAISE NOTICE '   - Set up RLS policies for reactions';
END $$;
