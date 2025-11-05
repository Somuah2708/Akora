-- Verify Likes and Comments Counts for Discover Posts
-- Run this after the fix to confirm counts are accurate

-- 1. Get summary of all posts with their like and comment counts
SELECT 
  p.id,
  p.content,
  p.created_at,
  prof.full_name as author,
  prof.is_admin,
  COALESCE(likes.count, 0) as total_likes,
  COALESCE(comments.count, 0) as total_comments
FROM posts p
LEFT JOIN profiles prof ON p.user_id = prof.id
LEFT JOIN (
  SELECT post_id, COUNT(*) as count
  FROM post_likes
  GROUP BY post_id
) likes ON p.id = likes.post_id
LEFT JOIN (
  SELECT post_id, COUNT(*) as count
  FROM post_comments
  GROUP BY post_id
) comments ON p.id = comments.post_id
WHERE prof.is_admin = false  -- Only non-admin posts (discover posts)
ORDER BY p.created_at DESC
LIMIT 20;

-- 2. Check for specific post (replace with your test post ID)
-- Uncomment and replace 'YOUR_POST_ID_HERE' with actual post ID
/*
SELECT 
  p.id,
  p.content,
  (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes,
  (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments
FROM posts p
WHERE p.id = 'YOUR_POST_ID_HERE';
*/

-- 3. List all users who liked a specific post
-- Uncomment and replace 'YOUR_POST_ID_HERE' with actual post ID
/*
SELECT 
  pl.user_id,
  prof.full_name,
  prof.username,
  pl.created_at
FROM post_likes pl
JOIN profiles prof ON pl.user_id = prof.id
WHERE pl.post_id = 'YOUR_POST_ID_HERE'
ORDER BY pl.created_at;
*/

-- 4. Check if there are any duplicate likes (there shouldn't be any)
SELECT 
  post_id,
  user_id,
  COUNT(*) as duplicate_count
FROM post_likes
GROUP BY post_id, user_id
HAVING COUNT(*) > 1;

-- If this returns any rows, there are duplicates that need to be cleaned up

-- 5. Check if UNIQUE constraint exists on post_likes
SELECT
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name = 'post_likes'
  AND tc.constraint_type = 'UNIQUE';

-- Should show a unique constraint on (post_id, user_id)
