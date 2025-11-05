-- Check the actual counts of likes and comments for discover posts
-- Run this in Supabase SQL Editor to verify the counts

-- 1. Check a specific post's likes count
SELECT 
  p.id as post_id,
  p.content,
  COUNT(DISTINCT pl.id) as likes_count,
  COUNT(DISTINCT pc.id) as comments_count
FROM posts p
LEFT JOIN post_likes pl ON p.id = pl.post_id
LEFT JOIN post_comments pc ON p.id = pc.post_id
WHERE p.id IN (
  -- Replace with actual post IDs you're testing with
  SELECT id FROM posts ORDER BY created_at DESC LIMIT 5
)
GROUP BY p.id, p.content
ORDER BY p.created_at DESC;

-- 2. Check if there are duplicate likes for the same user/post combination
SELECT 
  post_id,
  user_id,
  COUNT(*) as duplicate_count
FROM post_likes
GROUP BY post_id, user_id
HAVING COUNT(*) > 1;

-- 3. Check if there are duplicate comments
SELECT 
  post_id,
  user_id,
  content,
  COUNT(*) as duplicate_count
FROM post_comments
GROUP BY post_id, user_id, content
HAVING COUNT(*) > 1;

-- 4. List all likes and comments for posts (to see the actual data)
SELECT 
  'LIKES' as type,
  pl.post_id,
  pl.user_id,
  pl.created_at,
  p.content as post_content
FROM post_likes pl
JOIN posts p ON pl.post_id = p.id
ORDER BY pl.created_at DESC
LIMIT 20;

SELECT 
  'COMMENTS' as type,
  pc.post_id,
  pc.user_id,
  pc.content as comment_content,
  pc.created_at,
  p.content as post_content
FROM post_comments pc
JOIN posts p ON pc.post_id = p.id
ORDER BY pc.created_at DESC
LIMIT 20;
