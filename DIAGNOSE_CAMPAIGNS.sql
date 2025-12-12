-- Diagnostic Query: Check all campaigns and their statuses
-- Run this to see what campaigns exist and their current status

-- 1. Check all campaigns with their status
SELECT 
  id,
  title,
  status,
  goal_amount,
  current_amount,
  category,
  donors_count,
  created_at,
  CASE 
    WHEN current_amount >= goal_amount THEN '✅ Goal Met'
    ELSE '⏳ In Progress'
  END as progress_status
FROM donation_campaigns
ORDER BY created_at DESC;

-- 2. Check specifically for completed campaigns
SELECT 
  id,
  title,
  status,
  goal_amount,
  current_amount,
  category
FROM donation_campaigns
WHERE status = 'completed';

-- 3. Check the status values being used
SELECT DISTINCT status, COUNT(*) as count
FROM donation_campaigns
GROUP BY status;

-- 4. If no completed campaigns, mark the first active one as completed:
-- UPDATE donation_campaigns
-- SET status = 'completed'
-- WHERE id = (
--   SELECT id 
--   FROM donation_campaigns 
--   WHERE status = 'active' 
--   ORDER BY created_at DESC 
--   LIMIT 1
-- )
-- RETURNING id, title, status;
