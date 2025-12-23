-- SIMPLE FIX - Run this THIRD
-- Step 3: Re-enable RLS and create simple policies

ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;

-- Simple SELECT - everyone can read
CREATE POLICY "select_circle_members"
ON circle_members FOR SELECT TO authenticated
USING (true);

-- Simple INSERT - users add themselves
CREATE POLICY "insert_circle_members"
ON circle_members FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Simple UPDATE - creators only
CREATE POLICY "update_circle_members"
ON circle_members FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM circles WHERE circles.id = circle_members.circle_id AND circles.created_by = auth.uid()));

-- Simple DELETE - self or creator
CREATE POLICY "delete_circle_members"
ON circle_members FOR DELETE TO authenticated
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM circles WHERE circles.id = circle_members.circle_id AND circles.created_by = auth.uid()));
