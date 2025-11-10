-- Add group chat linking to circles
-- This creates a group chat for each circle automatically

-- Add group_chat_id column to circles table
ALTER TABLE circles 
ADD COLUMN IF NOT EXISTS group_chat_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_circles_group_chat ON circles(group_chat_id);

-- Function to automatically create group chat when circle is created
CREATE OR REPLACE FUNCTION create_circle_group_chat()
RETURNS TRIGGER AS $$
DECLARE
  new_group_id UUID;
BEGIN
  -- Create a group for this circle
  INSERT INTO groups (name, avatar_url, created_by)
  VALUES (NEW.name, NEW.image_url, NEW.created_by)
  RETURNING id INTO new_group_id;
  
  -- Add creator as admin member
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (new_group_id, NEW.created_by, 'admin');
  
  -- Update circle with group chat id
  NEW.group_chat_id := new_group_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create group chat for new circles
DROP TRIGGER IF EXISTS trigger_create_circle_group_chat ON circles;
CREATE TRIGGER trigger_create_circle_group_chat
  BEFORE INSERT ON circles
  FOR EACH ROW
  EXECUTE FUNCTION create_circle_group_chat();

-- Function to add circle member to group chat
CREATE OR REPLACE FUNCTION add_circle_member_to_group()
RETURNS TRIGGER AS $$
DECLARE
  circle_group_id UUID;
BEGIN
  -- Get the circle's group chat id
  SELECT group_chat_id INTO circle_group_id
  FROM circles
  WHERE id = NEW.circle_id;
  
  -- Add user to group chat if it exists
  IF circle_group_id IS NOT NULL THEN
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (circle_group_id, NEW.user_id, 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to add new circle members to group chat
DROP TRIGGER IF EXISTS trigger_add_circle_member_to_group ON circle_members;
CREATE TRIGGER trigger_add_circle_member_to_group
  AFTER INSERT ON circle_members
  FOR EACH ROW
  EXECUTE FUNCTION add_circle_member_to_group();

-- Function to remove circle member from group chat
CREATE OR REPLACE FUNCTION remove_circle_member_from_group()
RETURNS TRIGGER AS $$
DECLARE
  circle_group_id UUID;
BEGIN
  -- Get the circle's group chat id
  SELECT group_chat_id INTO circle_group_id
  FROM circles
  WHERE id = OLD.circle_id;
  
  -- Remove user from group chat if it exists
  IF circle_group_id IS NOT NULL THEN
    DELETE FROM group_members
    WHERE group_id = circle_group_id AND user_id = OLD.user_id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to remove circle members from group chat when they leave
DROP TRIGGER IF EXISTS trigger_remove_circle_member_from_group ON circle_members;
CREATE TRIGGER trigger_remove_circle_member_from_group
  AFTER DELETE ON circle_members
  FOR EACH ROW
  EXECUTE FUNCTION remove_circle_member_from_group();

-- For existing circles, create group chats (run once)
DO $$
DECLARE
  circle_record RECORD;
  new_group_id UUID;
BEGIN
  FOR circle_record IN 
    SELECT * FROM circles WHERE group_chat_id IS NULL
  LOOP
    -- Create group
    INSERT INTO groups (name, avatar_url, created_by)
    VALUES (circle_record.name, circle_record.image_url, circle_record.created_by)
    RETURNING id INTO new_group_id;
    
    -- Add creator as admin
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (new_group_id, circle_record.created_by, 'admin');
    
    -- Update circle
    UPDATE circles
    SET group_chat_id = new_group_id
    WHERE id = circle_record.id;
    
    -- Add all existing members to the group chat
    INSERT INTO group_members (group_id, user_id, role)
    SELECT new_group_id, user_id, 'member'
    FROM circle_members
    WHERE circle_id = circle_record.id
    AND user_id != circle_record.created_by
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END LOOP;
END $$;

-- Verify setup
SELECT 
  c.id as circle_id,
  c.name as circle_name,
  c.group_chat_id,
  g.name as group_chat_name,
  (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id) as circle_members_count,
  (SELECT COUNT(*) FROM group_members WHERE group_id = c.group_chat_id) as group_members_count
FROM circles c
LEFT JOIN groups g ON c.group_chat_id = g.id
ORDER BY c.created_at DESC
LIMIT 10;

COMMENT ON COLUMN circles.group_chat_id IS 'Group chat linked to this circle for member communication';
COMMENT ON FUNCTION create_circle_group_chat IS 'Automatically creates a group chat when a new circle is created';
COMMENT ON FUNCTION add_circle_member_to_group IS 'Adds new circle members to the circle group chat';
COMMENT ON FUNCTION remove_circle_member_from_group IS 'Removes circle members from the group chat when they leave the circle';
