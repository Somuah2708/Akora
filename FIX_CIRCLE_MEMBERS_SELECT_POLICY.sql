-- FIX: Allow users to read their own circle membership
-- The issue: Users can insert into circle_members but cannot SELECT their own records
-- This causes the UI to show "Join Circle" even when they're already a member

-- IMPORTANT: Avoid self-referential queries in policies to prevent infinite recursion!

-- Step 1: Temporarily disable RLS to clean up
ALTER TABLE circle_members DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view circle members" ON circle_members;
DROP POLICY IF EXISTS "Anyone can view circle members" ON circle_members;
DROP POLICY IF EXISTS "Authenticated users can view circle members" ON circle_members;
DROP POLICY IF EXISTS "circle_members_select_policy" ON circle_members;
DROP POLICY IF EXISTS "Enable read access for all users" ON circle_members;
DROP POLICY IF EXISTS "Users can join circles" ON circle_members;
DROP POLICY IF EXISTS "circle_members_insert_policy" ON circle_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON circle_members;
DROP POLICY IF EXISTS "Admins can update members" ON circle_members;
DROP POLICY IF EXISTS "Admins can update circle members" ON circle_members;
DROP POLICY IF EXISTS "Circle creators can update members" ON circle_members;
DROP POLICY IF EXISTS "circle_members_update_policy" ON circle_members;
DROP POLICY IF EXISTS "Enable update for users based on id" ON circle_members;
DROP POLICY IF EXISTS "Users can leave circles" ON circle_members;
DROP POLICY IF EXISTS "Users can leave or creators can remove" ON circle_members;
DROP POLICY IF EXISTS "circle_members_delete_policy" ON circle_members;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON circle_members;

-- Drop ANY remaining policies dynamically
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'circle_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON circle_members', pol.policyname);
    END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;

-- Step 4: Create SIMPLE policies that won't cause recursion

-- SELECT: All authenticated users can read (simple, no recursion)
CREATE POLICY "select_circle_members"
ON circle_members
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Authenticated users can insert themselves
CREATE POLICY "insert_circle_members"
ON circle_members
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Circle creators can update
CREATE POLICY "update_circle_members"
ON circle_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM circles
    WHERE circles.id = circle_members.circle_id
    AND circles.created_by = auth.uid()
  )
);

-- DELETE: Users can leave or creators can remove
CREATE POLICY "delete_circle_members"
ON circle_members
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM circles
    WHERE circles.id = circle_members.circle_id
    AND circles.created_by = auth.uid()
  )
);

-- Step 5: Also fix circles that don't have their creator as a member
-- This will add the creator as admin for any circles where they're missing
INSERT INTO circle_members (circle_id, user_id, role)
SELECT c.id, c.created_by, 'admin'
FROM circles c
WHERE NOT EXISTS (
  SELECT 1 FROM circle_members cm 
  WHERE cm.circle_id = c.id 
  AND cm.user_id = c.created_by
);

-- Verify the fix
SELECT 'Policies created:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'circle_members';

SELECT 'Circles without creator membership (should be 0):' as info;
SELECT c.id, c.name, c.created_by
FROM circles c
WHERE NOT EXISTS (
  SELECT 1 FROM circle_members cm 
  WHERE cm.circle_id = c.id 
  AND cm.user_id = c.created_by
);
