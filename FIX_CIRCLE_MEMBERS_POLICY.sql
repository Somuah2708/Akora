-- ============================================================
-- FIX: Allow circle creators to add themselves as first member
-- ============================================================
-- The current policy doesn't allow a circle creator to add themselves
-- because it requires an existing admin, but when creating a circle
-- there are no admins yet.

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can join public circles" ON circle_members;

-- Create a new policy that allows:
-- 1. Users to join public circles
-- 2. Circle creators to add themselves as the first member
-- 3. Circle admins to add members
CREATE POLICY "Users can join circles"
  ON circle_members FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Public circle: anyone can join
      EXISTS (
        SELECT 1 FROM circles 
        WHERE id = circle_id 
        AND is_private = false
      )
      OR
      -- Circle creator can add themselves (for first member)
      EXISTS (
        SELECT 1 FROM circles
        WHERE id = circle_id
        AND created_by = auth.uid()
      )
      OR
      -- Private circle: must be circle admin adding members
      EXISTS (
        SELECT 1 FROM circle_members cm
        WHERE cm.circle_id = circle_members.circle_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
      )
    )
  );

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Circle members INSERT policy updated!';
  RAISE NOTICE '   - Users can still join public circles';
  RAISE NOTICE '   - Circle creators can now add themselves as first member';
  RAISE NOTICE '   - Circle admins can still add members to private circles';
END $$;
