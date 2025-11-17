-- =====================================================
-- FIX ADMIN ACCESS FOR EDUCATION SCREEN
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Check current admin status
SELECT 
  id,
  email,
  username,
  full_name,
  role,
  is_admin,
  created_at
FROM public.profiles
WHERE email = 'bigsouu@gmail.com'  -- Your admin email
OR is_admin = true
OR role = 'admin';

-- Step 2: Set admin privileges (adjust email if needed)
UPDATE public.profiles
SET 
  is_admin = true,
  role = 'admin'
WHERE email = 'bigsouu@gmail.com'  -- REPLACE WITH YOUR ACTUAL ADMIN EMAIL IF DIFFERENT
RETURNING id, email, username, is_admin, role;

-- Step 3: Verify the update
SELECT 
  id,
  email,
  username,
  is_admin,
  role
FROM public.profiles
WHERE is_admin = true;

-- Step 4: Check RLS policies on products_services table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'products_services'
ORDER BY policyname;

-- Step 5: Check if there are any products_services records
SELECT 
  id,
  title,
  category_name,
  is_approved,
  created_at
FROM products_services
WHERE category_name IN ('Universities', 'Scholarships')
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- TROUBLESHOOTING NOTES:
-- 
-- If you still get "Access Denied":
-- 1. Make sure you're logged in with the email you updated above
-- 2. Try logging out and logging back in (this refreshes the session)
-- 3. Force close and reopen the app
-- 4. Check console logs for [useAuth] Profile data to verify is_admin: true
-- 
-- The fixes made to the code:
-- 1. Removed auto-redirect for admins in education screen
-- 2. Admins now see the content like regular users
-- 3. Plus button appears in header for admins to access admin panel
-- 4. Admin panel now waits for profile to load before checking access
-- =====================================================
