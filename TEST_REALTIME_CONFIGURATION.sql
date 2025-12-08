-- =====================================================
-- TEST REALTIME CONFIGURATION
-- =====================================================
-- Run these queries to verify realtime is properly set up
-- =====================================================

-- 1. Check which tables are in the realtime publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Expected: Should see direct_messages, admin_messages, notifications, etc.

-- 2. Check replica identity for each table
SELECT 
  c.relname as table_name,
  CASE c.relreplident
    WHEN 'd' THEN 'default (primary key)'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full (all columns)'
    WHEN 'i' THEN 'index'
  END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname IN (
  'direct_messages', 
  'admin_messages', 
  'notifications',
  'friend_requests',
  'friends',
  'admin_conversations'
)
AND n.nspname = 'public';

-- Expected: All should show 'full (all columns)'

-- 3. Check if realtime is enabled for authenticated role
SELECT 
  grantee, 
  table_schema, 
  table_name, 
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'authenticated'
AND table_name IN (
  'direct_messages', 
  'admin_messages', 
  'notifications'
)
ORDER BY table_name, privilege_type;

-- Expected: Should see SELECT, INSERT, UPDATE grants

-- 4. Check indexes for realtime performance
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN (
  'direct_messages',
  'notifications',
  'friend_requests'
)
AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Expected: Should see idx_direct_messages_* indexes

-- 5. Test direct_messages realtime (manual test)
-- In your app, open two devices/browsers
-- Send a message from Device A
-- Check if Device B receives it within 1 second

-- 6. Monitor realtime connections (optional)
-- Go to Supabase Dashboard → Database → Realtime
-- Should see active connections when users are in chat screens

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

-- If realtime is not working, run these diagnostics:

-- Check if publication exists
SELECT pubname FROM pg_publication WHERE pubname = 'supabase_realtime';

-- Check if tables have proper RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('direct_messages', 'notifications')
ORDER BY tablename, policyname;

-- Check current user's permissions
SELECT current_user, current_database();
