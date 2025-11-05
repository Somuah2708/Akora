-- ================================================
-- ENABLE REALTIME FOR DISCOVER PAGE
-- ================================================
-- Run this in Supabase SQL Editor to enable real-time updates
-- for likes and comments on the discover page
-- ================================================

-- Step 1: Enable realtime replication for post_likes table
ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;

-- Step 2: Enable realtime replication for post_comments table
ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;

-- Step 3: Verify realtime is enabled
SELECT 
  schemaname, 
  tablename,
  'Realtime enabled ✅' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('post_likes', 'post_comments')
ORDER BY tablename;

-- Expected output:
-- schemaname | tablename      | status
-- public     | post_comments  | Realtime enabled ✅
-- public     | post_likes     | Realtime enabled ✅

-- ================================================
-- If you see both tables listed above, you're all set!
-- ================================================

-- Step 4: Check RLS policies allow SELECT (optional but recommended)
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename IN ('post_likes', 'post_comments')
AND cmd = 'SELECT'
ORDER BY tablename, policyname;

-- You should see policies that allow SELECT operations

-- ================================================
-- TROUBLESHOOTING
-- ================================================

-- If realtime was already enabled and you want to refresh it:
-- ALTER PUBLICATION supabase_realtime DROP TABLE post_likes;
-- ALTER PUBLICATION supabase_realtime DROP TABLE post_comments;
-- Then re-run Steps 1 and 2 above

-- To see all tables with realtime enabled:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
