-- CHECK DELETE PERMISSIONS FOR COMMENTS

-- ============================================================================
-- CHECK 1: Show all RLS policies on announcement_comments
-- ============================================================================

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
WHERE schemaname = 'public' 
AND tablename = 'announcement_comments';

-- ============================================================================
-- CHECK 2: Verify DELETE policy exists
-- ============================================================================

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' 
      AND tablename = 'announcement_comments'
      AND cmd = 'DELETE'
    ) THEN '✓ DELETE policy exists'
    ELSE '✗ DELETE policy MISSING - Users cannot delete comments!'
  END as delete_policy_status;

-- ============================================================================
-- CHECK 3: Show table permissions
-- ============================================================================

SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
AND table_name = 'announcement_comments'
ORDER BY grantee, privilege_type;

-- ============================================================================
-- CHECK 4: Test if RLS is enabled
-- ============================================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'announcement_comments';

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
  '==================================================' as message
UNION ALL
SELECT 'DELETE PERMISSIONS CHECK COMPLETE'
UNION ALL
SELECT '==================================================='
UNION ALL
SELECT 'If DELETE policy is missing, run SETUP_COMMENTS_COMPLETE.sql';
