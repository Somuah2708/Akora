-- DIAGNOSE_DONATION_DATA.sql
-- This script checks all donation-related data to find inconsistencies

-- =====================================================
-- 1. CHECK DONATIONS TABLE
-- =====================================================
SELECT 
  'DONATIONS TABLE' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  SUM(amount) FILTER (WHERE status = 'approved') as approved_total,
  SUM(amount) as all_donations_total
FROM donations;

-- =====================================================
-- 2. LIST ALL DONATIONS WITH DETAILS
-- =====================================================
SELECT 
  d.id,
  d.amount,
  d.status,
  d.is_anonymous,
  d.created_at,
  dc.title as campaign_title,
  dc.current_amount as campaign_current_amount,
  p.full_name as donor_name
FROM donations d
LEFT JOIN donation_campaigns dc ON d.campaign_id = dc.id
LEFT JOIN profiles p ON d.user_id = p.id
ORDER BY d.created_at DESC;

-- =====================================================
-- 3. CHECK DONATION CAMPAIGNS TABLE
-- =====================================================
SELECT 
  id,
  title,
  current_amount,
  goal_amount,
  status,
  is_featured,
  created_at
FROM donation_campaigns
ORDER BY created_at DESC;

-- =====================================================
-- 4. COMPARE: Donations vs Campaign Amounts
-- =====================================================
SELECT 
  dc.id as campaign_id,
  dc.title,
  dc.current_amount as campaign_stored_amount,
  COALESCE(SUM(d.amount) FILTER (WHERE d.status = 'approved'), 0) as actual_approved_donations,
  dc.current_amount - COALESCE(SUM(d.amount) FILTER (WHERE d.status = 'approved'), 0) as difference
FROM donation_campaigns dc
LEFT JOIN donations d ON dc.id = d.campaign_id
GROUP BY dc.id, dc.title, dc.current_amount
ORDER BY difference DESC;

-- =====================================================
-- 5. CHECK FOR ORPHANED OR DUMMY DATA
-- =====================================================
-- Check campaigns with current_amount but no donations
SELECT 
  'Campaigns with amount but no donations' as issue_type,
  id,
  title,
  current_amount
FROM donation_campaigns
WHERE current_amount > 0
AND id NOT IN (SELECT DISTINCT campaign_id FROM donations WHERE status = 'approved')
ORDER BY current_amount DESC;

-- =====================================================
-- 6. UNIQUE DONORS COUNT
-- =====================================================
SELECT 
  'Unique Donors' as metric,
  COUNT(DISTINCT user_id) as count
FROM donations
WHERE status = 'approved';

-- =====================================================
-- 7. RESET CAMPAIGN AMOUNTS TO MATCH ACTUAL DONATIONS
-- (Uncomment to execute)
-- =====================================================
/*
UPDATE donation_campaigns dc
SET current_amount = COALESCE(
  (SELECT SUM(d.amount) 
   FROM donations d 
   WHERE d.campaign_id = dc.id 
   AND d.status = 'approved'), 
  0
);

SELECT 'Campaign amounts reset to match actual approved donations' as result;
*/
