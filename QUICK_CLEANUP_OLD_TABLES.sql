-- ========================================
-- QUICK CLEANUP: Remove Old Donation Tables
-- ========================================
-- Run this in your Supabase SQL Editor
-- ONLY after verifying all data is in new tables
-- ========================================

-- 1. Backup first (in your terminal/Supabase dashboard)
-- pg_dump -U postgres -d your_database > backup.sql

-- 2. Drop old tables
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.donors CASCADE;

-- 3. Verify they're gone
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('campaigns', 'donors', 'donation_campaigns', 'donations');

-- Expected result: Only donation_campaigns and donations should appear

-- 4. Done! Your app now uses only the new tables.
