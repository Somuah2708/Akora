-- Check and Set Admin Status
-- Run this script to verify and set your admin privileges

-- Step 1: Check your current admin status
-- Replace 'your-email@example.com' with your actual email
SELECT 
  id,
  email,
  full_name,
  is_admin,
  role,
  created_at
FROM profiles 
WHERE email = 'your-email@example.com';

-- Step 2: Set yourself as admin
-- Replace 'your-email@example.com' with your actual email
UPDATE profiles 
SET 
  is_admin = true, 
  role = 'admin'
WHERE email = 'your-email@example.com';

-- Step 3: Verify the update
SELECT 
  id,
  email,
  full_name,
  is_admin,
  role
FROM profiles 
WHERE email = 'your-email@example.com';

-- Step 4: If you don't know your email, list all profiles
-- (Comment out the WHERE clause if needed)
SELECT 
  id,
  email,
  full_name,
  is_admin,
  role,
  created_at
FROM profiles 
ORDER BY created_at DESC
LIMIT 10;
