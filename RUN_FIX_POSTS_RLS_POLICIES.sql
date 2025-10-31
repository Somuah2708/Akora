-- ================================================
-- IMPORTANT: Run this SQL in your Supabase Dashboard
-- ================================================
-- This migration ensures posts table has proper RLS policies
-- Allows authenticated users to create, view, update, and delete posts
-- ================================================

-- Step 1: Enable Row Level Security (if not already enabled)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
DROP POLICY IF EXISTS "Users can view posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

-- Step 3: Create new comprehensive policies

-- Policy 1: Anyone can view all posts (simple policy for now)
CREATE POLICY "Anyone can view posts"
ON posts FOR SELECT
USING (true);

-- Policy 2: Users can view their own posts
CREATE POLICY "Users can view own posts"
ON posts FOR SELECT
USING (auth.uid() = user_id);

-- Policy 4: Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts"
ON posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy 5: Users can update their own posts
CREATE POLICY "Users can update own posts"
ON posts FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 6: Users can delete their own posts
CREATE POLICY "Users can delete own posts"
ON posts FOR DELETE
USING (auth.uid() = user_id);

-- Step 4: Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'posts'
ORDER BY policyname;

-- ================================================
-- After running this, you should see 5 policies:
-- 1. Anyone can view posts
-- 2. Users can view own posts
-- 3. Authenticated users can create posts
-- 4. Users can update own posts
-- 5. Users can delete own posts
-- ================================================

-- Step 5: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON posts TO authenticated;
GRANT SELECT ON posts TO anon;

-- Step 6: Verify the setup
SELECT 
  'Table exists' as check_type,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'posts'
  )::text as result
UNION ALL
SELECT 
  'RLS enabled' as check_type,
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'posts')::text as result
UNION ALL
SELECT 
  'Policies count' as check_type,
  (SELECT COUNT(*)::text FROM pg_policies WHERE tablename = 'posts') as result;

-- ================================================
-- Troubleshooting:
-- If you still can't create posts, check:
-- 1. You are authenticated (auth.uid() returns a value)
-- 2. The user_id in your insert matches auth.uid()
-- 3. Check the browser console for detailed error messages
-- ================================================
