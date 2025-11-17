-- =====================================================
-- IMMEDIATE ADMIN FIX - Run this NOW
-- =====================================================
-- This script will immediately set your account as admin
-- Replace 'your-email@example.com' with your actual email

-- STEP 1: Find your account
SELECT 
    au.id as user_id,
    au.email,
    p.id as profile_id,
    p.username,
    p.is_admin as current_admin_status,
    p.role as current_role,
    CASE 
        WHEN p.id IS NULL THEN '⚠️  NO PROFILE EXISTS'
        WHEN p.is_admin = true THEN '✅ ALREADY ADMIN'
        ELSE '❌ NOT ADMIN - NEEDS FIX'
    END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'your-email@example.com';

-- STEP 2: Set as admin (uncomment after checking Step 1)
/*
UPDATE profiles 
SET 
    is_admin = true,
    role = 'admin',
    updated_at = now()
WHERE id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'your-email@example.com'
);
*/

-- STEP 3: Verify it worked (uncomment after Step 2)
/*
SELECT 
    p.id,
    au.email,
    p.username,
    p.is_admin,
    p.role,
    p.updated_at,
    CASE 
        WHEN p.is_admin = true THEN '✅ SUCCESS - YOU ARE NOW ADMIN!'
        ELSE '❌ FAILED - TRY AGAIN'
    END as result
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'your-email@example.com';
*/

-- =====================================================
-- IF YOU DON'T KNOW YOUR EMAIL
-- =====================================================
-- Run this to see all recent users:
/*
SELECT 
    au.id,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    p.is_admin,
    p.role
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.last_sign_in_at DESC NULLS LAST
LIMIT 10;
*/

-- =====================================================
-- IF PROFILE DOESN'T EXIST (from Step 1)
-- =====================================================
-- Create profile with admin privileges:
/*
INSERT INTO profiles (id, username, full_name, is_admin, role, created_at, updated_at)
SELECT 
    au.id,
    COALESCE(split_part(au.email, '@', 1), 'admin'),
    COALESCE(split_part(au.email, '@', 1), 'Admin User'),
    true,
    'admin',
    now(),
    now()
FROM auth.users au
WHERE au.email = 'your-email@example.com'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = au.id);
*/

-- =====================================================
-- NUCLEAR OPTION (testing only)
-- =====================================================
-- Make the most recent user admin:
/*
UPDATE profiles 
SET is_admin = true, role = 'admin', updated_at = now()
WHERE id = (
    SELECT id FROM profiles ORDER BY created_at DESC LIMIT 1
);

SELECT * FROM profiles WHERE is_admin = true;
*/
