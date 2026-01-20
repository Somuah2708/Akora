-- =====================================================
-- CENTENARY COMMITTEE DETAILS - Extended Schema
-- =====================================================
-- This migration adds:
-- 1. Extended fields on centenary_committees (goals, vision, plans, gallery, group_chat_id)
-- 2. Committee members table with roles (admin/member)
-- 3. Committee join requests table
-- 4. Committee resources table (documents/links)
-- 5. Triggers for auto-creating group chats
-- =====================================================

-- =====================================================
-- 1. EXTEND CENTENARY_COMMITTEES TABLE
-- =====================================================

-- Add new columns to centenary_committees
ALTER TABLE centenary_committees
ADD COLUMN IF NOT EXISTS goals TEXT,
ADD COLUMN IF NOT EXISTS vision TEXT,
ADD COLUMN IF NOT EXISTS plans TEXT,
ADD COLUMN IF NOT EXISTS gallery_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS group_chat_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- =====================================================
-- 2. COMMITTEE MEMBERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS centenary_committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES centenary_committees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (committee_id, user_id)
);

-- Enable RLS
ALTER TABLE centenary_committee_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for committee_members
CREATE POLICY "Anyone can view committee members"
ON centenary_committee_members FOR SELECT
USING (true);

CREATE POLICY "Committee admins can manage members"
ON centenary_committee_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM centenary_committee_members ccm
    WHERE ccm.committee_id = centenary_committee_members.committee_id
    AND ccm.user_id = auth.uid()
    AND ccm.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Committee admins can update members"
ON centenary_committee_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM centenary_committee_members ccm
    WHERE ccm.committee_id = centenary_committee_members.committee_id
    AND ccm.user_id = auth.uid()
    AND ccm.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Committee admins can delete members"
ON centenary_committee_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM centenary_committee_members ccm
    WHERE ccm.committee_id = centenary_committee_members.committee_id
    AND ccm.user_id = auth.uid()
    AND ccm.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_committee_members_committee ON centenary_committee_members(committee_id);
CREATE INDEX IF NOT EXISTS idx_committee_members_user ON centenary_committee_members(user_id);

-- =====================================================
-- 3. COMMITTEE JOIN REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS centenary_committee_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES centenary_committees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT, -- Optional message from applicant
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (committee_id, user_id)
);

-- Enable RLS
ALTER TABLE centenary_committee_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for join_requests
CREATE POLICY "Users can view their own requests"
ON centenary_committee_join_requests FOR SELECT
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM centenary_committee_members ccm
    WHERE ccm.committee_id = centenary_committee_join_requests.committee_id
    AND ccm.user_id = auth.uid()
    AND ccm.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Anyone can create a join request"
ON centenary_committee_join_requests FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Committee admins can update requests"
ON centenary_committee_join_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM centenary_committee_members ccm
    WHERE ccm.committee_id = centenary_committee_join_requests.committee_id
    AND ccm.user_id = auth.uid()
    AND ccm.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Users can delete their pending requests"
ON centenary_committee_join_requests FOR DELETE
USING (
  (user_id = auth.uid() AND status = 'pending')
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_join_requests_committee ON centenary_committee_join_requests(committee_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_user ON centenary_committee_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON centenary_committee_join_requests(status);

-- =====================================================
-- 4. COMMITTEE RESOURCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS centenary_committee_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES centenary_committees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'document' CHECK (category IN ('document', 'link')),
  file_type TEXT, -- pdf, doc, xlsx, etc. (null for links)
  file_size INTEGER, -- in bytes (null for links)
  uploaded_by UUID REFERENCES profiles(id),
  download_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE centenary_committee_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resources
CREATE POLICY "Anyone can view active resources"
ON centenary_committee_resources FOR SELECT
USING (is_active = true);

CREATE POLICY "Committee admins can insert resources"
ON centenary_committee_resources FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM centenary_committee_members ccm
    WHERE ccm.committee_id = centenary_committee_resources.committee_id
    AND ccm.user_id = auth.uid()
    AND ccm.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Committee admins can update resources"
ON centenary_committee_resources FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM centenary_committee_members ccm
    WHERE ccm.committee_id = centenary_committee_resources.committee_id
    AND ccm.user_id = auth.uid()
    AND ccm.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Committee admins can delete resources"
ON centenary_committee_resources FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM centenary_committee_members ccm
    WHERE ccm.committee_id = centenary_committee_resources.committee_id
    AND ccm.user_id = auth.uid()
    AND ccm.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_resources_committee ON centenary_committee_resources(committee_id);

-- =====================================================
-- 5. FUNCTION: CREATE GROUP CHAT FOR COMMITTEE
-- =====================================================

CREATE OR REPLACE FUNCTION create_committee_group_chat()
RETURNS TRIGGER AS $$
DECLARE
  new_group_id UUID;
  group_creator_id UUID;
BEGIN
  -- Only create group chat if one doesn't exist
  IF NEW.group_chat_id IS NULL THEN
    -- Use the committee creator, or find a fallback admin
    group_creator_id := NEW.created_by;
    
    IF group_creator_id IS NULL THEN
      -- Get a fallback admin user
      SELECT id INTO group_creator_id
      FROM profiles
      WHERE is_admin = true
      LIMIT 1;
    END IF;
    
    -- Only create group if we have a valid creator
    IF group_creator_id IS NOT NULL THEN
      -- Insert into groups table
      INSERT INTO groups (name, avatar_url, created_by)
      VALUES (
        NEW.name || ' Committee',
        NULL,
        group_creator_id
      )
      RETURNING id INTO new_group_id;
      
      -- Set the group_chat_id on the committee
      NEW.group_chat_id := new_group_id;
      
      -- Add the creator as admin of the group chat
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (new_group_id, group_creator_id, 'admin')
      ON CONFLICT (group_id, user_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-creating group chat on committee insert
DROP TRIGGER IF EXISTS trigger_create_committee_group_chat ON centenary_committees;
CREATE TRIGGER trigger_create_committee_group_chat
  BEFORE INSERT ON centenary_committees
  FOR EACH ROW
  EXECUTE FUNCTION create_committee_group_chat();

-- =====================================================
-- 6. FUNCTION: ADD APPROVED MEMBER TO GROUP CHAT
-- =====================================================

CREATE OR REPLACE FUNCTION add_committee_member_to_group_chat()
RETURNS TRIGGER AS $$
DECLARE
  committee_group_id UUID;
BEGIN
  -- Get the committee's group chat ID
  SELECT group_chat_id INTO committee_group_id
  FROM centenary_committees
  WHERE id = NEW.committee_id;
  
  -- If group chat exists, add the member
  IF committee_group_id IS NOT NULL THEN
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (
      committee_group_id,
      NEW.user_id,
      CASE WHEN NEW.role = 'admin' THEN 'admin' ELSE 'member' END
    )
    ON CONFLICT (group_id, user_id) 
    DO UPDATE SET role = CASE WHEN NEW.role = 'admin' THEN 'admin' ELSE 'member' END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-adding members to group chat
DROP TRIGGER IF EXISTS trigger_add_committee_member_to_group ON centenary_committee_members;
CREATE TRIGGER trigger_add_committee_member_to_group
  AFTER INSERT ON centenary_committee_members
  FOR EACH ROW
  EXECUTE FUNCTION add_committee_member_to_group_chat();

-- =====================================================
-- 7. FUNCTION: REMOVE MEMBER FROM GROUP CHAT ON DELETE
-- =====================================================

CREATE OR REPLACE FUNCTION remove_committee_member_from_group_chat()
RETURNS TRIGGER AS $$
DECLARE
  committee_group_id UUID;
BEGIN
  -- Get the committee's group chat ID
  SELECT group_chat_id INTO committee_group_id
  FROM centenary_committees
  WHERE id = OLD.committee_id;
  
  -- If group chat exists, remove the member
  IF committee_group_id IS NOT NULL THEN
    DELETE FROM group_members
    WHERE group_id = committee_group_id
    AND user_id = OLD.user_id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for removing members from group chat
DROP TRIGGER IF EXISTS trigger_remove_committee_member_from_group ON centenary_committee_members;
CREATE TRIGGER trigger_remove_committee_member_from_group
  AFTER DELETE ON centenary_committee_members
  FOR EACH ROW
  EXECUTE FUNCTION remove_committee_member_from_group_chat();

-- =====================================================
-- 8. FUNCTION: UPDATE MEMBER ROLE IN GROUP CHAT
-- =====================================================

CREATE OR REPLACE FUNCTION update_committee_member_role_in_group()
RETURNS TRIGGER AS $$
DECLARE
  committee_group_id UUID;
BEGIN
  -- Only run if role changed
  IF OLD.role != NEW.role THEN
    -- Get the committee's group chat ID
    SELECT group_chat_id INTO committee_group_id
    FROM centenary_committees
    WHERE id = NEW.committee_id;
    
    -- If group chat exists, update the member's role
    IF committee_group_id IS NOT NULL THEN
      UPDATE group_members
      SET role = CASE WHEN NEW.role = 'admin' THEN 'admin' ELSE 'member' END
      WHERE group_id = committee_group_id
      AND user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updating member role in group chat
DROP TRIGGER IF EXISTS trigger_update_committee_member_role ON centenary_committee_members;
CREATE TRIGGER trigger_update_committee_member_role
  AFTER UPDATE ON centenary_committee_members
  FOR EACH ROW
  EXECUTE FUNCTION update_committee_member_role_in_group();

-- =====================================================
-- 9. HELPER FUNCTION: GET COMMITTEE MEMBER COUNT
-- =====================================================

CREATE OR REPLACE FUNCTION get_committee_member_count(p_committee_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM centenary_committee_members
  WHERE committee_id = p_committee_id;
$$ LANGUAGE sql STABLE;

-- =====================================================
-- 10. CREATE GROUP CHATS FOR EXISTING COMMITTEES
-- =====================================================

-- This creates group chats for any existing committees that don't have one
-- We need to find a valid admin user to set as the group creator
DO $$
DECLARE
  committee_record RECORD;
  new_group_id UUID;
  fallback_admin_id UUID;
BEGIN
  -- Get a fallback admin user (first admin in the system)
  SELECT id INTO fallback_admin_id
  FROM profiles
  WHERE is_admin = true
  LIMIT 1;

  -- If no admin found, skip creating group chats
  IF fallback_admin_id IS NULL THEN
    RAISE NOTICE 'No admin user found. Skipping group chat creation for existing committees.';
    RETURN;
  END IF;

  FOR committee_record IN 
    SELECT id, name, created_by 
    FROM centenary_committees 
    WHERE group_chat_id IS NULL
  LOOP
    -- Create the group using committee creator or fallback admin
    INSERT INTO groups (name, avatar_url, created_by)
    VALUES (
      committee_record.name || ' Committee', 
      NULL, 
      COALESCE(committee_record.created_by, fallback_admin_id)
    )
    RETURNING id INTO new_group_id;
    
    -- Update the committee with the group_chat_id
    UPDATE centenary_committees
    SET group_chat_id = new_group_id
    WHERE id = committee_record.id;
    
    -- Add the group creator as admin
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (new_group_id, COALESCE(committee_record.created_by, fallback_admin_id), 'admin')
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END LOOP;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
