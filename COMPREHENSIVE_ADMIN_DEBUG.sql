-- =====================================================
-- COMPREHENSIVE ADMIN ACCESS DIAGNOSTIC
-- Run this entire script in Supabase SQL Editor
-- =====================================================

-- STEP 1: Check if profiles table exists and has required columns
-- =====================================================
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name IN ('id', 'email', 'is_admin', 'role', 'username', 'full_name')
ORDER BY ordinal_position;

-- STEP 2: List ALL profiles with their admin status
-- =====================================================
SELECT 
    p.id,
    p.username,
    p.full_name,
    p.is_admin,
    p.role,
    au.email,
    p.created_at,
    p.updated_at
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
ORDER BY p.created_at DESC;

-- STEP 3: Check if there are ANY admin users at all
-- =====================================================
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN is_admin = true THEN 1 END) as admin_count,
    COUNT(CASE WHEN role IN ('admin', 'staff') THEN 1 END) as role_admin_count
FROM profiles;

-- STEP 4: Check auth.users table for your account
-- =====================================================
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    last_sign_in_at,
    role as auth_role
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- STEP 5: Check if profile exists for each auth user
-- =====================================================
SELECT 
    au.id,
    au.email,
    au.created_at as auth_created,
    p.id as profile_id,
    p.username,
    p.is_admin,
    p.role,
    CASE 
        WHEN p.id IS NULL THEN '❌ NO PROFILE'
        WHEN p.is_admin = true THEN '✅ ADMIN'
        WHEN p.role IN ('admin', 'staff') THEN '✅ ADMIN (role)'
        ELSE '❌ NOT ADMIN'
    END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.created_at DESC;

-- STEP 6: Check RLS policies on profiles table
-- =====================================================
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
WHERE tablename = 'profiles';

-- STEP 7: Test if YOU can read your own profile
-- (Replace with your actual email in the next query)
-- =====================================================
-- First, find your user ID:
SELECT 
    id,
    email
FROM auth.users
WHERE email ILIKE '%@%' -- Replace with your email pattern
ORDER BY created_at DESC
LIMIT 5;

-- STEP 8: Manual fix - Set a user as admin
-- =====================================================
-- UNCOMMENT AND EDIT THIS SECTION AFTER FINDING YOUR EMAIL:

/*
-- Set admin by email (finds user via auth.users join)
UPDATE profiles 
SET 
    is_admin = true,
    role = 'admin',
    updated_at = now()
WHERE id = (
    SELECT id 
    FROM auth.users 
    WHERE email = 'YOUR_EMAIL_HERE@example.com'
);

-- Verify the update worked
SELECT 
    p.id,
    au.email,
    p.username,
    p.is_admin,
    p.role,
    p.updated_at
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'YOUR_EMAIL_HERE@example.com';
*/

-- STEP 9: Check if event_settings table exists (for admin-settings screen)
-- =====================================================
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name = 'event_settings';

-- If it exists, check its contents
SELECT * FROM event_settings LIMIT 1;

-- STEP 10: Check for any triggers that might auto-create profiles
-- =====================================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('users', 'profiles')
   OR trigger_name ILIKE '%profile%';

-- =====================================================
-- QUICK FIX COMMANDS (uncomment after verifying your email)
-- =====================================================

/*
-- OPTION A: Set admin by email (RECOMMENDED)
UPDATE profiles 
SET is_admin = true, role = 'admin', updated_at = now()
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);

-- OPTION B: Set admin by username
UPDATE profiles 
SET is_admin = true, role = 'admin', updated_at = now()
WHERE username = 'your_username';

-- OPTION C: Set the MOST RECENT user as admin (for testing only!)
UPDATE profiles 
SET is_admin = true, role = 'admin', updated_at = now()
WHERE id = (SELECT id FROM profiles ORDER BY created_at DESC LIMIT 1);

-- Verify any of the above worked:
SELECT p.*, au.email 
FROM profiles p 
LEFT JOIN auth.users au ON p.id = au.id 
WHERE p.is_admin = true OR p.role IN ('admin', 'staff');
*/
