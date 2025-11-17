-- Quick Admin Status Check
-- Run this in Supabase SQL Editor to see all users and their admin status

SELECT 
  id,
  email,
  full_name,
  is_admin,
  role,
  created_at
FROM profiles 
ORDER BY created_at DESC;

-- If you need to set a specific user as admin, run:
-- UPDATE profiles SET is_admin = true, role = 'admin' WHERE email = 'your-email@example.com';
