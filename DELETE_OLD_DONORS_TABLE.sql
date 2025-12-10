-- DELETE_OLD_DONORS_TABLE.sql
-- This script removes the old donors table and keeps the new donations-based system

-- Drop the old donors table and all its dependencies
DROP TABLE IF EXISTS public.donors CASCADE;

-- Verify the donations table exists and has the correct structure
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'donations' 
ORDER BY ordinal_position;

-- Check if you have any data in donations table
SELECT 
  COUNT(*) as total_donations,
  COUNT(DISTINCT user_id) as unique_donors,
  SUM(amount) as total_amount,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_donations,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_donations
FROM donations;
