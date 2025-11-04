-- CHECK IF THE COMMENT COUNT TRIGGER EXISTS AND WORKS

-- 1. Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'announcement_comments'
AND trigger_name LIKE '%comment_count%';

-- 2. Check if trigger function exists
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'update_announcement_comment_count'
AND routine_schema = 'public';

-- 3. Show current comment counts
SELECT 
  a.title,
  a.comment_count,
  COUNT(c.id) as actual_comments
FROM public.secretariat_announcements a
LEFT JOIN public.announcement_comments c ON c.announcement_id = a.id
GROUP BY a.id, a.title, a.comment_count
ORDER BY a.created_at DESC;
