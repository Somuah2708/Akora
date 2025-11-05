-- Find and Fix Broken Image References in Discover Posts
-- Run this in Supabase SQL Editor

-- 1. Find posts with potentially broken image URLs
SELECT 
  p.id,
  p.user_id,
  p.content,
  p.image_url,
  p.image_urls,
  p.created_at,
  prof.full_name as author
FROM posts p
LEFT JOIN profiles prof ON p.user_id = prof.id
WHERE prof.is_admin = false  -- Only discover posts (non-admin)
  AND (
    p.image_url IS NOT NULL 
    OR p.image_urls IS NOT NULL
  )
ORDER BY p.created_at DESC
LIMIT 50;

-- 2. Check if the problematic image is in highlights (your specific error)
-- This query shows all posts that reference highlights in their images
SELECT 
  p.id,
  p.content,
  p.image_url,
  p.image_urls,
  prof.full_name as author
FROM posts p
LEFT JOIN profiles prof ON p.user_id = prof.id
WHERE prof.is_admin = false
  AND (
    p.image_url LIKE '%highlights%'
    OR p.image_urls::text LIKE '%highlights%'
  )
ORDER BY p.created_at DESC;

-- 3. Find the specific post with the broken image
-- Replace the filename with your actual broken image filename
SELECT 
  p.id,
  p.content,
  p.image_url,
  p.image_urls,
  prof.full_name as author,
  p.created_at
FROM posts p
LEFT JOIN profiles prof ON p.user_id = prof.id
WHERE 
  p.image_url LIKE '%hl_a8c79b6c-c552-4ba1-83c0-3934404fb40c%'
  OR p.image_urls::text LIKE '%hl_a8c79b6c-c552-4ba1-83c0-3934404fb40c%';

-- 4. FIX: Remove NULL or broken image from a specific post
-- Uncomment and run this if you want to remove the broken image reference
/*
UPDATE posts
SET 
  image_url = NULL,
  image_urls = NULL
WHERE id = 'YOUR_POST_ID_HERE';  -- Replace with actual post ID from query above
*/

-- 5. FIX: Remove ALL broken highlights references (use with caution!)
-- Only run this if you're sure all highlights images are broken
/*
UPDATE posts
SET 
  image_url = CASE 
    WHEN image_url LIKE '%highlights%' THEN NULL 
    ELSE image_url 
  END,
  image_urls = CASE 
    WHEN image_urls::text LIKE '%highlights%' THEN NULL 
    ELSE image_urls 
  END
WHERE 
  image_url LIKE '%highlights%'
  OR image_urls::text LIKE '%highlights%';
*/

-- 6. Check Supabase Storage buckets
-- This shows what storage buckets exist
SELECT 
  name,
  id,
  public,
  created_at
FROM storage.buckets;

-- Expected to see a 'media' bucket or similar

-- 7. Verify the specific file exists in storage
-- You'll need to check this in Supabase Dashboard → Storage
-- Navigate to: media → highlights → look for the file

-- ================================================
-- SUMMARY OF FIXES
-- ================================================
-- Option A: Delete the post with broken image (if it's not important)
-- Option B: Update the post to remove image reference (keep text)
-- Option C: Re-upload the image to the correct location
-- Option D: Ignore it (app will show broken image icon but won't crash)
-- ================================================
