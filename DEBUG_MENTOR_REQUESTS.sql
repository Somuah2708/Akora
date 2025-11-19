-- =====================================================
-- DEBUG: Mentor Requests Not Showing
-- =====================================================
-- Run this in Supabase SQL Editor to debug why requests aren't showing

-- 1. Check all alumni_mentors (especially the approved mentor account)
SELECT 
  'ALUMNI MENTORS' as section,
  id as mentor_id,
  full_name,
  email,
  user_id,
  status,
  application_type,
  created_at
FROM alumni_mentors
WHERE status = 'approved'
ORDER BY created_at DESC;

-- 2. Check all mentor_requests
SELECT 
  'MENTOR REQUESTS' as section,
  mr.id as request_id,
  mr.mentor_id,
  mr.mentee_id,
  mr.mentee_name,
  mr.mentee_email,
  mr.status as request_status,
  mr.created_at as requested_at,
  am.full_name as mentor_name,
  am.email as mentor_email,
  am.user_id as mentor_user_id
FROM mentor_requests mr
LEFT JOIN alumni_mentors am ON mr.mentor_id = am.id
ORDER BY mr.created_at DESC;

-- 3. Check if mentor_id matches between request and mentor lookup
SELECT 
  'MENTOR ID MISMATCH CHECK' as section,
  mr.mentor_id as request_mentor_id,
  am_by_id.full_name as mentor_by_id,
  am_by_email.id as mentor_id_by_email,
  am_by_email.full_name as mentor_by_email,
  CASE 
    WHEN mr.mentor_id = am_by_email.id THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as match_status
FROM mentor_requests mr
LEFT JOIN alumni_mentors am_by_id ON mr.mentor_id = am_by_id.id
LEFT JOIN alumni_mentors am_by_email ON LOWER(am_by_email.email) = LOWER(am_by_id.email)
WHERE am_by_email.status = 'approved'
ORDER BY mr.created_at DESC;

-- 4. Check profiles and their corresponding mentors
SELECT 
  'PROFILE TO MENTOR MAPPING' as section,
  p.id as profile_id,
  p.email as profile_email,
  p.full_name as profile_name,
  am.id as mentor_id,
  am.full_name as mentor_name,
  am.email as mentor_email,
  am.status as mentor_status
FROM profiles p
LEFT JOIN alumni_mentors am ON LOWER(am.email) = LOWER(p.email)
WHERE am.id IS NOT NULL
ORDER BY am.created_at DESC;

-- 5. Find orphaned requests (requests without matching mentor)
SELECT 
  'ORPHANED REQUESTS' as section,
  mr.id as request_id,
  mr.mentor_id,
  mr.mentee_name,
  mr.created_at,
  CASE 
    WHEN am.id IS NULL THEN '❌ Mentor not found'
    WHEN am.status != 'approved' THEN '⚠️ Mentor not approved'
    ELSE '✅ Valid'
  END as issue
FROM mentor_requests mr
LEFT JOIN alumni_mentors am ON mr.mentor_id = am.id
ORDER BY mr.created_at DESC;
