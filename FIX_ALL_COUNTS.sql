-- FIX ALL COUNTS: Comments, Likes, Views, and Comment Likes

-- ============================================================================
-- 1. Show what's currently wrong
-- ============================================================================

SELECT 
  a.title,
  a.comment_count as stored_comments,
  COUNT(DISTINCT c.id) as actual_comments,
  a.like_count as stored_likes,
  COUNT(DISTINCT l.id) as actual_likes,
  a.view_count as stored_views,
  COUNT(DISTINCT v.user_id) as actual_views
FROM public.secretariat_announcements a
LEFT JOIN public.announcement_comments c ON c.announcement_id = a.id
LEFT JOIN public.announcement_likes l ON l.announcement_id = a.id
LEFT JOIN public.announcement_views v ON v.announcement_id = a.id
GROUP BY a.id, a.title, a.comment_count, a.like_count, a.view_count
ORDER BY a.created_at DESC;

-- ============================================================================
-- 2. Fix comment counts
-- ============================================================================

UPDATE public.secretariat_announcements a
SET comment_count = (
  SELECT COUNT(*)
  FROM public.announcement_comments c
  WHERE c.announcement_id = a.id
);

-- ============================================================================
-- 3. Fix like counts
-- ============================================================================

UPDATE public.secretariat_announcements a
SET like_count = (
  SELECT COUNT(*)
  FROM public.announcement_likes l
  WHERE l.announcement_id = a.id
);

-- ============================================================================
-- 4. Fix view counts
-- ============================================================================

UPDATE public.secretariat_announcements a
SET view_count = (
  SELECT COUNT(DISTINCT user_id)
  FROM public.announcement_views v
  WHERE v.announcement_id = a.id
);

-- ============================================================================
-- 5. Fix comment like counts (if like_count column exists)
-- ============================================================================

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'announcement_comments' 
    AND column_name = 'like_count'
  ) THEN
    UPDATE public.announcement_comments c
    SET like_count = (
      SELECT COUNT(*)
      FROM public.announcement_comment_likes l
      WHERE l.comment_id = c.id
    );
    RAISE NOTICE '✓ Fixed comment like counts';
  ELSE
    RAISE NOTICE '⚠ like_count column does not exist in announcement_comments';
  END IF;
END $$;

-- ============================================================================
-- 6. Ensure no NULL values
-- ============================================================================

UPDATE public.secretariat_announcements
SET 
  comment_count = COALESCE(comment_count, 0),
  like_count = COALESCE(like_count, 0),
  view_count = COALESCE(view_count, 0);

-- ============================================================================
-- 7. Verify everything is fixed
-- ============================================================================

SELECT 
  a.title,
  a.comment_count,
  a.like_count,
  a.view_count,
  COUNT(DISTINCT c.id) as actual_comments,
  COUNT(DISTINCT l.id) as actual_likes,
  COUNT(DISTINCT v.user_id) as actual_views
FROM public.secretariat_announcements a
LEFT JOIN public.announcement_comments c ON c.announcement_id = a.id
LEFT JOIN public.announcement_likes l ON l.announcement_id = a.id
LEFT JOIN public.announcement_views v ON v.announcement_id = a.id
GROUP BY a.id, a.title, a.comment_count, a.like_count, a.view_count
ORDER BY a.created_at DESC
LIMIT 10;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT '========================================' as status
UNION ALL
SELECT '✓ ALL COUNTS RECALCULATED!'
UNION ALL
SELECT '========================================'
UNION ALL
SELECT 'Check the results above to verify counts are correct';
