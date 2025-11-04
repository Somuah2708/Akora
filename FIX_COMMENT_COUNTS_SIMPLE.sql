-- SIMPLE FIX: Recalculate all comment counts

-- First, let's see what's wrong
SELECT 
  a.id,
  a.title,
  a.comment_count as stored_count,
  COUNT(c.id) as actual_count,
  (a.comment_count - COUNT(c.id)) as difference
FROM public.secretariat_announcements a
LEFT JOIN public.announcement_comments c ON c.announcement_id = a.id
GROUP BY a.id, a.title, a.comment_count
HAVING a.comment_count != COUNT(c.id)
ORDER BY a.created_at DESC;

-- Now fix all the counts
UPDATE public.secretariat_announcements a
SET comment_count = (
  SELECT COUNT(*)
  FROM public.announcement_comments c
  WHERE c.announcement_id = a.id
);

-- Verify the fix
SELECT 
  a.title,
  a.comment_count as stored_count,
  COUNT(c.id) as actual_count
FROM public.secretariat_announcements a
LEFT JOIN public.announcement_comments c ON c.announcement_id = a.id
GROUP BY a.id, a.title, a.comment_count
ORDER BY a.created_at DESC
LIMIT 10;
