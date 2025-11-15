-- CHECK_AND_FIX_ADMIN_ACCOUNT.sql
-- Check current admin accounts and fix admin privileges

-- Step 1: Check which accounts exist and their admin status
SELECT 
  id,
  email,
  full_name,
  role,
  is_admin,
  created_at
FROM public.profiles
ORDER BY created_at DESC;

-- Step 2: If your admin account isn't properly set, update it
-- REPLACE 'your-admin-email@example.com' with your actual admin email

-- Option A: Set by email (recommended - replace with your email)
UPDATE public.profiles
SET 
  is_admin = true,
  role = 'admin'
WHERE email = 'bigsouu@gmail.com'  -- REPLACE WITH YOUR ADMIN EMAIL
RETURNING id, email, full_name, role, is_admin;

-- Option B: If you know your user ID, use this instead:
-- UPDATE public.profiles
-- SET 
--   is_admin = true,
--   role = 'admin'
-- WHERE id = 'your-user-id-here'
-- RETURNING id, email, full_name, role, is_admin;

-- Step 3: Verify the update worked
SELECT 
  id,
  email,
  full_name,
  role,
  is_admin
FROM public.profiles
WHERE is_admin = true OR role = 'admin';
