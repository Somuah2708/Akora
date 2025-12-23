-- SIMPLE FIX - Run this SECOND
-- Step 2: Drop all policies one by one
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
DROP POLICY IF EXISTS "select_circle_members" ON circle_members;
DROP POLICY IF EXISTS "insert_circle_members" ON circle_members;
DROP POLICY IF EXISTS "update_circle_members" ON circle_members;
DROP POLICY IF EXISTS "delete_circle_members" ON circle_members;
