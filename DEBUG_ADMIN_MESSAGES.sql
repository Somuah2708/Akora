-- Debug: Check if support messages exist and real-time is enabled

-- 1. Check if any admin messages exist
SELECT COUNT(*) as total_messages FROM admin_messages;

-- 2. Check if any conversations exist
SELECT * FROM admin_conversations ORDER BY last_message_at DESC;

-- 3. Check who sent messages
SELECT 
  am.id,
  am.user_id,
  am.message,
  am.sender_type,
  am.created_at,
  p.full_name,
  p.email
FROM admin_messages am
LEFT JOIN profiles p ON p.id = am.user_id
ORDER BY am.created_at DESC
LIMIT 10;

-- 4. Check if real-time is enabled for both tables
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('admin_messages', 'admin_conversations');

-- Expected results:
-- Query 1: Should show count > 0 if messages exist
-- Query 2: Should show conversation records
-- Query 3: Should show messages with user details
-- Query 4: Should show 2 rows (both tables enabled for real-time)

-- If Query 4 shows 0 or 1 rows, run these:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_conversations;
