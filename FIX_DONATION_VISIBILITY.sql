-- FIX_DONATION_VISIBILITY.sql
-- Fix donation visibility and campaign progress updates
-- This ensures all users can see approved donations and campaign progress updates correctly

-- ============================================
-- 1. UPDATE RLS POLICIES ON DONATIONS TABLE
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own donations" ON donations;
DROP POLICY IF EXISTS "Users can insert their own donations" ON donations;
DROP POLICY IF EXISTS "Admins can view all donations" ON donations;
DROP POLICY IF EXISTS "Users can view approved donations" ON donations;
DROP POLICY IF EXISTS "Users can create donations" ON donations;

-- Policy 1: Allow users to view APPROVED donations (for transparency)
-- This lets everyone see successful donations on campaigns
CREATE POLICY "Users can view approved donations"
ON donations
FOR SELECT
TO authenticated
USING (status = 'approved');

-- Policy 2: Allow users to view their OWN donations regardless of status
-- This lets users track their pending/rejected donations
CREATE POLICY "Users can view their own donations"
ON donations
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 3: Allow admins to view ALL donations (including pending/rejected)
CREATE POLICY "Admins can view all donations"
ON donations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.is_admin = true OR profiles.role = 'admin')
  )
);

-- Policy 4: Allow users to create their own donations
CREATE POLICY "Users can create donations"
ON donations
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy 5: Allow admins to update any donation (for approval/rejection)
DROP POLICY IF EXISTS "Admins can update donations" ON donations;
CREATE POLICY "Admins can update donations"
ON donations
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

-- ============================================
-- 2. FIX CAMPAIGN AMOUNT UPDATE TRIGGER
-- ============================================

-- This trigger updates campaign amounts when donations are approved
-- SECURITY DEFINER allows it to bypass RLS restrictions
CREATE OR REPLACE FUNCTION update_campaign_amount()
RETURNS TRIGGER
SECURITY DEFINER -- This allows the function to bypass RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- When a donation is newly approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE donation_campaigns
    SET 
      current_amount = COALESCE(current_amount, 0) + NEW.amount,
      donors_count = COALESCE(donors_count, 0) + 1,
      updated_at = NOW()
    WHERE id = NEW.campaign_id;
    
    RAISE NOTICE 'Added donation: % to campaign %, new amount: %', 
      NEW.amount, NEW.campaign_id, 
      (SELECT current_amount FROM donation_campaigns WHERE id = NEW.campaign_id);
    
  -- When a donation is unapproved (rejected or status changed from approved)
  ELSIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE donation_campaigns
    SET 
      current_amount = GREATEST(COALESCE(current_amount, 0) - OLD.amount, 0),
      donors_count = GREATEST(COALESCE(donors_count, 0) - 1, 0),
      updated_at = NOW()
    WHERE id = NEW.campaign_id;
    
    RAISE NOTICE 'Removed donation: % from campaign %, new amount: %', 
      OLD.amount, NEW.campaign_id,
      (SELECT current_amount FROM donation_campaigns WHERE id = NEW.campaign_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS update_campaign_amount_trigger ON donations;
CREATE TRIGGER update_campaign_amount_trigger
  AFTER INSERT OR UPDATE OF status, amount ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_amount();

-- ============================================
-- 3. VERIFY THE CHANGES
-- ============================================

-- Check policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'donations'
ORDER BY policyname;

-- Check current campaign amounts
SELECT 
  id,
  title,
  current_amount,
  goal_amount,
  donors_count,
  (SELECT COUNT(*) FROM donations WHERE campaign_id = donation_campaigns.id AND status = 'approved') as actual_approved_donations,
  (SELECT SUM(amount) FROM donations WHERE campaign_id = donation_campaigns.id AND status = 'approved') as actual_approved_amount
FROM donation_campaigns
ORDER BY created_at DESC;

-- ============================================
-- 4. OPTIONAL: RECALCULATE ALL CAMPAIGN AMOUNTS
-- ============================================
-- Run this if you want to fix any existing discrepancies

-- Update all campaigns with correct totals based on approved donations
UPDATE donation_campaigns c
SET 
  current_amount = COALESCE((
    SELECT SUM(amount)
    FROM donations
    WHERE campaign_id = c.id AND status = 'approved'
  ), 0),
  donors_count = COALESCE((
    SELECT COUNT(DISTINCT user_id)
    FROM donations
    WHERE campaign_id = c.id AND status = 'approved'
  ), 0),
  updated_at = NOW()
WHERE id IN (SELECT DISTINCT campaign_id FROM donations);

-- Show the results
SELECT 
  id,
  title,
  current_amount,
  goal_amount,
  donors_count,
  status
FROM donation_campaigns
ORDER BY created_at DESC;
