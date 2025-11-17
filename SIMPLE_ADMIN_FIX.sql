-- =====================================================
-- ULTRA SIMPLE FIX - Copy and run this in Supabase
-- =====================================================

-- Step 1: See all your users (find your email)
SELECT 
    au.email,
    p.is_admin,
    p.role
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.created_at DESC;

-- Step 2: Copy the command below, replace YOUR_EMAIL, and run it
-- UPDATE profiles SET is_admin = true, role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com');

-- Step 3: Verify it worked
-- SELECT au.email, p.is_admin, p.role FROM profiles p JOIN auth.users au ON p.id = au.id WHERE p.is_admin = true;
