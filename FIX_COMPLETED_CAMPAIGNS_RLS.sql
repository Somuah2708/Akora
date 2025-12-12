-- Comprehensive RLS Fix for Admin Campaign Operations
-- This fixes all admin operations: SELECT, INSERT, UPDATE, DELETE

-- ============================================
-- 1. CHECK CURRENT POLICIES
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'donation_campaigns';

-- ============================================
-- 2. DROP ALL EXISTING POLICIES
-- ============================================
DROP POLICY IF EXISTS "Campaigns are viewable by everyone" ON donation_campaigns;
DROP POLICY IF EXISTS "Active and completed campaigns are viewable by everyone" ON donation_campaigns;
DROP POLICY IF EXISTS "Anyone can create campaigns" ON donation_campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON donation_campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON donation_campaigns;
DROP POLICY IF EXISTS "Admins can update all campaigns" ON donation_campaigns;
DROP POLICY IF EXISTS "Admins can delete all campaigns" ON donation_campaigns;

-- ============================================
-- 3. CREATE NEW COMPREHENSIVE POLICIES
-- ============================================

-- SELECT: Anyone can view active and completed campaigns
CREATE POLICY "Public can view active and completed campaigns"
ON donation_campaigns
FOR SELECT
TO public
USING (status IN ('active', 'completed'));

-- SELECT: Admins can view ALL campaigns (including inactive)
CREATE POLICY "Admins can view all campaigns"
ON donation_campaigns
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.is_admin = true OR profiles.role = 'admin')
  )
);

-- INSERT: Authenticated admins can create campaigns
CREATE POLICY "Admins can create campaigns"
ON donation_campaigns
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.is_admin = true OR profiles.role = 'admin')
  )
);

-- UPDATE: Admins can update any campaign
CREATE POLICY "Admins can update all campaigns"
ON donation_campaigns
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.is_admin = true OR profiles.role = 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.is_admin = true OR profiles.role = 'admin')
  )
);

-- DELETE: Admins can delete any campaign
CREATE POLICY "Admins can delete all campaigns"
ON donation_campaigns
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.is_admin = true OR profiles.role = 'admin')
  )
);

-- ============================================
-- 4. VERIFY NEW POLICIES
-- ============================================
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'donation_campaigns'
ORDER BY cmd, policyname;

-- ============================================
-- 5. TEST QUERIES (Run these after policies are created)
-- ============================================

-- Test SELECT for completed campaigns
-- SELECT id, title, status FROM donation_campaigns WHERE status = 'completed';

-- Test that you can see all campaigns as admin
-- SELECT id, title, status FROM donation_campaigns ORDER BY created_at DESC;

-- Test UPDATE (replace with actual campaign ID)
-- UPDATE donation_campaigns SET status = 'active' WHERE id = 'your-campaign-id';

-- Test DELETE (replace with actual campaign ID)
-- DELETE FROM donation_campaigns WHERE id = 'your-test-campaign-id';
