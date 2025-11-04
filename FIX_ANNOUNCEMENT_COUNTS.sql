-- FIX AND INITIALIZE ANNOUNCEMENT COUNTS
-- Run this to fix incorrect view_count, like_count, and comment_count

-- ============================================================================
-- STEP 1: Reset and recalculate comment counts
-- ============================================================================

UPDATE public.secretariat_announcements a
SET comment_count = (
  SELECT COUNT(*)
  FROM public.announcement_comments c
  WHERE c.announcement_id = a.id
);

-- ============================================================================
-- STEP 2: Reset and recalculate like counts  
-- ============================================================================

UPDATE public.secretariat_announcements a
SET like_count = (
  SELECT COUNT(*)
  FROM public.announcement_likes l
  WHERE l.announcement_id = a.id
);

-- ============================================================================
-- STEP 3: Reset and recalculate view counts
-- ============================================================================

UPDATE public.secretariat_announcements a
SET view_count = (
  SELECT COUNT(DISTINCT user_id)
  FROM public.announcement_views v
  WHERE v.announcement_id = a.id
);

-- ============================================================================
-- STEP 4: Reset and recalculate comment like counts
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
    RAISE NOTICE '✓ Updated comment like counts';
  ELSE
    RAISE NOTICE '⚠ like_count column does not exist in announcement_comments';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Set default values for NULL counts
-- ============================================================================

UPDATE public.secretariat_announcements
SET 
  comment_count = COALESCE(comment_count, 0),
  like_count = COALESCE(like_count, 0),
  view_count = COALESCE(view_count, 0);

-- ============================================================================
-- STEP 6: Verification
-- ============================================================================

DO $$
DECLARE
  total_announcements INTEGER;
  announcements_with_counts INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_announcements
  FROM public.secretariat_announcements;
  
  SELECT COUNT(*) INTO announcements_with_counts
  FROM public.secretariat_announcements
  WHERE comment_count >= 0 AND like_count >= 0 AND view_count >= 0;
  
  RAISE NOTICE '';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'COUNTS RECALCULATED!';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Total announcements: %', total_announcements;
  RAISE NOTICE 'Announcements with valid counts: %', announcements_with_counts;
  RAISE NOTICE '';
  RAISE NOTICE 'Sample counts:';
END $$;

-- Show sample of recalculated counts
SELECT 
  title,
  view_count,
  like_count,
  comment_count
FROM public.secretariat_announcements
ORDER BY created_at DESC
LIMIT 5;
