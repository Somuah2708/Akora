-- CHECK IF ALL REQUIRED TABLES AND COLUMNS EXIST
-- Run this first to diagnose what's missing

-- ============================================================================
-- CHECK 1: Does secretariat_announcements table exist?
-- ============================================================================

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'secretariat_announcements'
    ) THEN '✓ secretariat_announcements table EXISTS'
    ELSE '✗ secretariat_announcements table MISSING'
  END as announcements_table;

-- ============================================================================
-- CHECK 2: What columns exist in secretariat_announcements?
-- ============================================================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'secretariat_announcements'
ORDER BY ordinal_position;

-- ============================================================================
-- CHECK 3: Does announcement_comments table exist?
-- ============================================================================

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'announcement_comments'
    ) THEN '✓ announcement_comments table EXISTS'
    ELSE '✗ announcement_comments table MISSING - Run SETUP_COMMENTS_COMPLETE.sql'
  END as comments_table;

-- ============================================================================
-- CHECK 4: What columns exist in announcement_comments?
-- ============================================================================

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'announcement_comments'
ORDER BY ordinal_position;

-- ============================================================================
-- CHECK 5: Does announcement_comment_likes table exist?
-- ============================================================================

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'announcement_comment_likes'
    ) THEN '✓ announcement_comment_likes table EXISTS'
    ELSE '✗ announcement_comment_likes table MISSING - Run SETUP_COMMENTS_COMPLETE.sql'
  END as comment_likes_table;

-- ============================================================================
-- CHECK 6: Does announcement_likes table exist?
-- ============================================================================

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'announcement_likes'
    ) THEN '✓ announcement_likes table EXISTS'
    ELSE '✗ announcement_likes table MISSING'
  END as likes_table;

-- ============================================================================
-- CHECK 7: Does announcement_views table exist?
-- ============================================================================

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'announcement_views'
    ) THEN '✓ announcement_views table EXISTS'
    ELSE '✗ announcement_views table MISSING'
  END as views_table;

-- ============================================================================
-- CHECK 8: List all triggers on these tables
-- ============================================================================

SELECT 
  trigger_name,
  event_object_table as table_name,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN (
  'secretariat_announcements',
  'announcement_comments', 
  'announcement_comment_likes',
  'announcement_likes',
  'announcement_views'
)
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
  '==================================================' as message
UNION ALL
SELECT 'DATABASE STRUCTURE CHECK COMPLETE'
UNION ALL
SELECT '==================================================='
UNION ALL
SELECT 'Review the results above to see what is missing';
