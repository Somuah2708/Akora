-- =====================================================
-- CHECK MENTOR DASHBOARD RLS POLICIES
-- =====================================================
-- Run this to verify RLS policies are working correctly

-- 1. Check all RLS policies on mentor_requests table
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
WHERE tablename = 'mentor_requests'
ORDER BY policyname;

-- 2. Test if mentor can see their requests (simulate RLS)
-- Replace with actual user_id of kofi@gmail.com
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claim.sub = '66428b6f-1e14-4be8-947f-a33d39dbf046';

SELECT 
  'TEST: Requests visible to mentor' as test,
  mr.id,
  mr.mentor_id,
  mr.mentee_name,
  mr.status,
  am.email as mentor_email
FROM mentor_requests mr
LEFT JOIN alumni_mentors am ON mr.mentor_id = am.id
WHERE mr.mentor_id = 'eb16b2b4-b0f1-4cc8-bd6e-a3f8650ed876';

RESET role;

-- 3. Check if there's a policy blocking SELECT
SELECT 
  'All Requests (no RLS)' as test,
  id,
  mentor_id,
  mentee_name,
  status
FROM mentor_requests
WHERE mentor_id = 'eb16b2b4-b0f1-4cc8-bd6e-a3f8650ed876';

-- 4. Check the exact policy condition for mentors viewing requests
SELECT 
  policyname,
  qual as policy_condition
FROM pg_policies
WHERE tablename = 'mentor_requests'
  AND cmd = 'SELECT'
  AND policyname LIKE '%mentor%';
