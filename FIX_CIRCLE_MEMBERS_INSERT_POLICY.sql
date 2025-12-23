-- FIX: Allow circle creators/admins to add members when approving join requests
-- The current policy only allows users to add themselves
-- We need to allow the circle creator to also add other users

-- Drop the existing insert policy
DROP POLICY IF EXISTS "insert_circle_members" ON circle_members;
DROP POLICY IF EXISTS "circle_members_insert_policy" ON circle_members;

-- Create new INSERT policy that allows:
-- 1. Users to add themselves (for public circles)
-- 2. Circle creators to add any user (for approving join requests)
CREATE POLICY "insert_circle_members"
ON circle_members FOR INSERT TO authenticated
WITH CHECK (
  -- User can add themselves
  auth.uid() = user_id
  OR
  -- Circle creator can add anyone
  EXISTS (
    SELECT 1 FROM circles 
    WHERE circles.id = circle_members.circle_id 
    AND circles.created_by = auth.uid()
  )
);
