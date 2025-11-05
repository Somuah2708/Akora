-- ================================================
-- TEST DOCUMENT MESSAGE TYPE SUPPORT
-- ================================================
-- Run this query to check if document messages are supported
-- ================================================

-- Check if the constraints exist and what values they allow
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname LIKE '%message_type_check%'
ORDER BY table_name;

-- ================================================
-- EXPECTED OUTPUT (if migration was run successfully):
-- ================================================
-- direct_messages_message_type_check | direct_messages | CHECK ((message_type = ANY (ARRAY['text'::text, 'image'::text, 'video'::text, 'voice'::text, 'document'::text])))
-- group_messages_message_type_check | group_messages | CHECK ((message_type = ANY (ARRAY['text'::text, 'image'::text, 'video'::text, 'voice'::text, 'document'::text])))
-- ================================================
-- If 'document' is NOT in the list, you need to run RUN_THIS_MIGRATION.sql
-- ================================================

-- Test inserting a document message (this will fail if migration not run)
-- DO NOT RUN THIS - Just for testing
-- INSERT INTO direct_messages (sender_id, receiver_id, message, message_type, media_url)
-- VALUES ('your-user-id', 'friend-id', '📄 test.pdf', 'document', 'https://example.com/test.pdf');
