-- ========================================
-- CLEANUP OLD DONATION TABLES
-- ========================================
-- This script removes the OLD donation tables that have been replaced
-- with the new donation_campaigns and donations tables.
--
-- OLD TABLES (to be removed):
-- - campaigns (replaced by donation_campaigns)
-- - donors (no longer needed - data tracked in donations table)
--
-- NEW TABLES (keep these):
-- - donation_campaigns
-- - donations
-- - donor_tiers
--
-- Run this ONLY after confirming:
-- 1. All data has been migrated to new tables
-- 2. All app code references new tables
-- 3. You have a backup of your database
-- ========================================

-- Drop old campaigns table and all its dependencies
DROP TABLE IF EXISTS public.campaigns CASCADE;

-- Drop old donors table and all its dependencies
DROP TABLE IF EXISTS public.donors CASCADE;

-- Drop any functions associated with old tables
DROP FUNCTION IF EXISTS update_donor_stats() CASCADE;
DROP FUNCTION IF EXISTS calculate_donor_recognition_level() CASCADE;

-- Drop any old triggers
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
DROP TRIGGER IF EXISTS update_donors_updated_at ON public.donors;
DROP TRIGGER IF EXISTS donor_stats_trigger ON public.donations;

-- Drop any old storage buckets for campaign images (if using old bucket)
-- Note: Only uncomment if you're sure the old bucket is not in use
-- DELETE FROM storage.buckets WHERE id = 'campaign-images';

-- Verify remaining donation tables
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%donation%' OR table_name LIKE '%campaign%' OR table_name LIKE '%donor%'
ORDER BY table_name;

-- Expected output should show:
-- - donation_campaigns
-- - donations
-- - donor_tiers

-- Check for any orphaned policies
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename IN ('campaigns', 'donors')
ORDER BY tablename;

COMMENT ON TABLE public.donation_campaigns IS 'Active donation campaigns table - replaces old campaigns table';
COMMENT ON TABLE public.donations IS 'Individual donation records - replaces data from old donors table';
COMMENT ON TABLE public.donor_tiers IS 'Donor recognition tiers based on total contributions';
