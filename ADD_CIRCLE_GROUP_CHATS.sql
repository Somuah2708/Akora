-- Add circle group chat support
-- This links each circle to a group chat for member communication

-- Add circle_id column to chats table to link circles to their group chats
ALTER TABLE chats ADD COLUMN IF NOT EXISTS circle_id UUID REFERENCES circles(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chats_circle_id ON chats(circle_id);

-- Add unique constraint to ensure one chat per circle
ALTER TABLE chats ADD CONSTRAINT unique_circle_chat UNIQUE (circle_id);

-- Update RLS policies to allow circle members to access circle chat
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Circle members can view circle chat" ON chats;

-- Create policy for circle members to view their circle's chat
CREATE POLICY "Circle members can view circle chat"
  ON chats FOR SELECT
  USING (
    -- Users can see direct/group chats they're part of (existing logic)
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = chats.id
      AND chat_participants.user_id = auth.uid()
    )
    OR
    -- Users can see chats linked to circles they're members of
    (
      circle_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM circle_members
        WHERE circle_members.circle_id = chats.circle_id
        AND circle_members.user_id = auth.uid()
      )
    )
  );

-- Function to automatically create group chat when circle is created
CREATE OR REPLACE FUNCTION create_circle_group_chat()
RETURNS TRIGGER AS $$
DECLARE
  new_chat_id UUID;
BEGIN
  -- Create a group chat for the circle
  INSERT INTO chats (type, name, avatar_url, circle_id)
  VALUES ('group', NEW.name, NULL, NEW.id)
  RETURNING id INTO new_chat_id;

  -- Add the circle creator as the first participant
  INSERT INTO chat_participants (chat_id, user_id)
  VALUES (new_chat_id, NEW.created_by);

  -- Log the chat creation
  RAISE NOTICE 'Created group chat % for circle %', new_chat_id, NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_circle_chat ON circles;

-- Create trigger to automatically create chat when circle is created
CREATE TRIGGER trigger_create_circle_chat
  AFTER INSERT ON circles
  FOR EACH ROW
  EXECUTE FUNCTION create_circle_group_chat();

-- Function to automatically add new circle members to the circle's group chat
CREATE OR REPLACE FUNCTION add_member_to_circle_chat()
RETURNS TRIGGER AS $$
DECLARE
  circle_chat_id UUID;
BEGIN
  -- Find the chat associated with this circle
  SELECT id INTO circle_chat_id
  FROM chats
  WHERE circle_id = NEW.circle_id;

  -- Add the new member to the circle's chat
  IF circle_chat_id IS NOT NULL THEN
    INSERT INTO chat_participants (chat_id, user_id)
    VALUES (circle_chat_id, NEW.user_id)
    ON CONFLICT (chat_id, user_id) DO NOTHING;

    RAISE NOTICE 'Added user % to circle chat %', NEW.user_id, circle_chat_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_add_member_to_chat ON circle_members;

-- Create trigger to add members to chat when they join circle
CREATE TRIGGER trigger_add_member_to_chat
  AFTER INSERT ON circle_members
  FOR EACH ROW
  EXECUTE FUNCTION add_member_to_circle_chat();

-- Function to remove members from circle chat when they leave
CREATE OR REPLACE FUNCTION remove_member_from_circle_chat()
RETURNS TRIGGER AS $$
DECLARE
  circle_chat_id UUID;
BEGIN
  -- Find the chat associated with this circle
  SELECT id INTO circle_chat_id
  FROM chats
  WHERE circle_id = OLD.circle_id;

  -- Remove the member from the circle's chat
  IF circle_chat_id IS NOT NULL THEN
    DELETE FROM chat_participants
    WHERE chat_id = circle_chat_id
    AND user_id = OLD.user_id;

    RAISE NOTICE 'Removed user % from circle chat %', OLD.user_id, circle_chat_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_remove_member_from_chat ON circle_members;

-- Create trigger to remove members from chat when they leave circle
CREATE TRIGGER trigger_remove_member_from_chat
  AFTER DELETE ON circle_members
  FOR EACH ROW
  EXECUTE FUNCTION remove_member_from_circle_chat();

-- Create group chats for existing circles that don't have one
DO $$
DECLARE
  circle_record RECORD;
  new_chat_id UUID;
BEGIN
  FOR circle_record IN 
    SELECT c.id, c.name, c.created_by
    FROM circles c
    LEFT JOIN chats ch ON ch.circle_id = c.id
    WHERE ch.id IS NULL
  LOOP
    -- Create chat for this circle
    INSERT INTO chats (type, name, circle_id)
    VALUES ('group', circle_record.name, circle_record.id)
    RETURNING id INTO new_chat_id;

    -- Add creator as participant
    INSERT INTO chat_participants (chat_id, user_id)
    VALUES (new_chat_id, circle_record.created_by)
    ON CONFLICT (chat_id, user_id) DO NOTHING;

    -- Add all existing members to the chat
    INSERT INTO chat_participants (chat_id, user_id)
    SELECT new_chat_id, user_id
    FROM circle_members
    WHERE circle_id = circle_record.id
    ON CONFLICT (chat_id, user_id) DO NOTHING;

    RAISE NOTICE 'Created group chat % for existing circle %', new_chat_id, circle_record.id;
  END LOOP;
END $$;

-- Verify the setup
SELECT 
  c.id as circle_id,
  c.name as circle_name,
  ch.id as chat_id,
  ch.name as chat_name,
  COUNT(DISTINCT cm.user_id) as circle_members,
  COUNT(DISTINCT cp.user_id) as chat_participants
FROM circles c
LEFT JOIN chats ch ON ch.circle_id = c.id
LEFT JOIN circle_members cm ON cm.circle_id = c.id
LEFT JOIN chat_participants cp ON cp.chat_id = ch.id
GROUP BY c.id, c.name, ch.id, ch.name
ORDER BY c.created_at DESC;

-- Add comments for documentation
COMMENT ON COLUMN chats.circle_id IS 'Links this chat to a circle for group communication';
COMMENT ON FUNCTION create_circle_group_chat() IS 'Automatically creates a group chat when a circle is created';
COMMENT ON FUNCTION add_member_to_circle_chat() IS 'Automatically adds members to circle chat when they join';
COMMENT ON FUNCTION remove_member_from_circle_chat() IS 'Automatically removes members from circle chat when they leave';
