-- QUICK CHECK: Show current announcement counts
SELECT 
  id,
  title,
  view_count,
  like_count,
  comment_count,
  created_at
FROM public.secretariat_announcements
ORDER BY created_at DESC
LIMIT 10;

-- Show actual comment count vs stored count
SELECT 
  a.title,
  a.comment_count as stored_count,
  COUNT(c.id) as actual_comments
FROM public.secretariat_announcements a
LEFT JOIN public.announcement_comments c ON c.announcement_id = a.id
GROUP BY a.id, a.title, a.comment_count
ORDER BY a.created_at DESC
LIMIT 10;
