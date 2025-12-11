-- ========================================
-- IDENTIFY POTENTIALLY UNUSED TABLES
-- ========================================
-- This query helps identify tables that might be unused
-- Review carefully before dropping any tables!
-- ========================================

-- List all tables in the public schema
SELECT 
  table_name,
  (SELECT COUNT(*) 
   FROM information_schema.columns 
   WHERE table_schema = 'public' 
   AND table_name = t.table_name) as column_count,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as size
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ========================================
-- KNOWN OLD/UNUSED TABLES TO CHECK:
-- ========================================

-- 1. OLD DONATION TABLES (confirmed to be replaced)
-- campaigns -> replaced by donation_campaigns
-- donors -> replaced by donations table tracking

-- 2. Check if these tables exist and have data:
DO $$ 
BEGIN
  -- Check campaigns table (OLD)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'campaigns') THEN
    RAISE NOTICE 'OLD TABLE FOUND: campaigns - Should be dropped (replaced by donation_campaigns)';
    EXECUTE 'SELECT COUNT(*) as record_count FROM campaigns' INTO TEMP TABLE campaigns_count;
    RAISE NOTICE 'campaigns table has % records', (SELECT * FROM campaigns_count);
  END IF;

  -- Check donors table (OLD)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'donors') THEN
    RAISE NOTICE 'OLD TABLE FOUND: donors - Should be dropped (replaced by donations tracking)';
    EXECUTE 'SELECT COUNT(*) as record_count FROM donors' INTO TEMP TABLE donors_count;
    RAISE NOTICE 'donors table has % records', (SELECT * FROM donors_count);
  END IF;

  -- Check donation_campaigns table (NEW)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'donation_campaigns') THEN
    RAISE NOTICE 'NEW TABLE FOUND: donation_campaigns - KEEP THIS';
    EXECUTE 'SELECT COUNT(*) as record_count FROM donation_campaigns' INTO TEMP TABLE donation_campaigns_count;
    RAISE NOTICE 'donation_campaigns table has % records', (SELECT * FROM donation_campaigns_count);
  END IF;

  -- Check donations table (NEW)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'donations') THEN
    RAISE NOTICE 'NEW TABLE FOUND: donations - KEEP THIS';
    EXECUTE 'SELECT COUNT(*) as record_count FROM donations' INTO TEMP TABLE donations_count;
    RAISE NOTICE 'donations table has % records', (SELECT * FROM donations_count);
  END IF;
END $$;

-- ========================================
-- CHECK FOR OTHER POTENTIALLY UNUSED TABLES
-- ========================================

-- Find tables with zero rows (might be unused)
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup = 0
ORDER BY tablename;

-- ========================================
-- MIGRATION VERIFICATION
-- ========================================

-- If you're ready to drop old tables, verify data migration first:

-- Compare campaign counts (if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'campaigns') 
     AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'donation_campaigns') THEN
    RAISE NOTICE '=== CAMPAIGN COMPARISON ===';
    RAISE NOTICE 'Old campaigns table: %', (SELECT COUNT(*) FROM campaigns);
    RAISE NOTICE 'New donation_campaigns table: %', (SELECT COUNT(*) FROM donation_campaigns);
  END IF;
END $$;

-- ========================================
-- SAFE CLEANUP RECOMMENDATIONS
-- ========================================

COMMENT ON DATABASE CURRENT_DATABASE() IS 
'After verifying data migration:
1. Run CLEANUP_OLD_DONATION_TABLES.sql to remove campaigns and donors tables
2. Keep these donation tables: donation_campaigns, donations, donor_tiers
3. Backup database before any DROP operations
4. Test app thoroughly after cleanup';

-- Show which tables are actively used (have recent activity)
SELECT 
  schemaname,
  tablename,
  n_live_tup as rows,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  last_vacuum,
  last_autovacuum,
  last_analyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) DESC
LIMIT 30;
