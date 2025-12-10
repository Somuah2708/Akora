-- CLEANUP_DUMMY_DATA.sql
-- This script removes all dummy/seed data and resets campaigns to accurate amounts

-- =====================================================
-- STEP 1: VIEW CURRENT DATA BEFORE CLEANUP
-- =====================================================
SELECT 'BEFORE CLEANUP - Donations' as status;
SELECT 
  id, 
  amount, 
  status, 
  payment_method,
  created_at,
  donor_message
FROM donations
ORDER BY created_at DESC;

SELECT 'BEFORE CLEANUP - Campaigns' as status;
SELECT 
  id, 
  title, 
  current_amount, 
  goal_amount,
  status
FROM donation_campaigns;

-- =====================================================
-- STEP 2: DELETE ALL DONATIONS (CAREFUL!)
-- Uncomment the line below to delete ALL donations
-- =====================================================
-- DELETE FROM donations;

-- =====================================================
-- OR: Delete only test/dummy donations
-- (Donations with placeholder receipts or test references)
-- =====================================================
/*
DELETE FROM donations 
WHERE 
  payment_proof_url LIKE '%placeholder%' 
  OR payment_proof_url LIKE '%via.placeholder.com%'
  OR donor_message LIKE '%test%'
  OR donor_message LIKE '%Test%';
*/

-- =====================================================
-- STEP 3: RESET ALL CAMPAIGN AMOUNTS TO ZERO
-- (Uncomment to execute)
-- =====================================================
/*
UPDATE donation_campaigns 
SET current_amount = 0;
*/

-- =====================================================
-- STEP 4: RESET CAMPAIGN AMOUNTS TO MATCH ACTUAL DONATIONS
-- This recalculates based on approved donations only
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
*/

-- =====================================================
-- STEP 5: VERIFY CLEANUP
-- =====================================================
SELECT 'AFTER CLEANUP - Donations Count' as status;
SELECT COUNT(*) as total_donations FROM donations;

SELECT 'AFTER CLEANUP - Campaign Amounts' as status;
SELECT 
  title, 
  current_amount,
  (SELECT COUNT(*) FROM donations d WHERE d.campaign_id = donation_campaigns.id AND d.status = 'approved') as approved_donations_count
FROM donation_campaigns;

-- =====================================================
-- RECOMMENDED: Run this to sync everything
-- =====================================================
/*
-- Delete test donations
DELETE FROM donations 
WHERE payment_proof_url LIKE '%placeholder%';

-- Reset all campaign amounts to actual approved donations
UPDATE donation_campaigns dc
SET current_amount = COALESCE(
  (SELECT SUM(d.amount) 
   FROM donations d 
   WHERE d.campaign_id = dc.id 
   AND d.status = 'approved'), 
  0
);

-- Verify
SELECT 
  'Campaign' as type,
  dc.title,
  dc.current_amount as displayed_amount,
  COALESCE(SUM(d.amount), 0) as actual_approved_amount
FROM donation_campaigns dc
LEFT JOIN donations d ON dc.id = d.campaign_id AND d.status = 'approved'
GROUP BY dc.id, dc.title, dc.current_amount;
*/
