-- ========================================
-- FIX: Enable Realtime for Media Messages
-- ========================================
-- Run this in your Supabase SQL Editor to ensure
-- direct_messages and group_messages are in the realtime publication

-- 1. Check current realtime publication status
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN tablename IN (
      SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
    ) THEN '✅ ENABLED'
    ELSE '❌ NOT ENABLED'
  END as realtime_status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('direct_messages', 'group_messages')
ORDER BY tablename;

-- 2. Ensure REPLICA IDENTITY is FULL (required for realtime updates)
DO $$
BEGIN
  ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
  RAISE NOTICE '✅ direct_messages replica identity set to FULL';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Could not set replica identity for direct_messages: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE public.group_messages REPLICA IDENTITY FULL;
  RAISE NOTICE '✅ group_messages replica identity set to FULL';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Could not set replica identity for group_messages: %', SQLERRM;
END $$;

-- 3. Add tables to supabase_realtime publication (if not already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
  RAISE NOTICE '✅ direct_messages added to realtime publication';
EXCEPTION 
  WHEN duplicate_object THEN
    RAISE NOTICE '✅ direct_messages already in realtime publication';
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not add direct_messages to publication: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
  RAISE NOTICE '✅ group_messages added to realtime publication';
EXCEPTION 
  WHEN duplicate_object THEN
    RAISE NOTICE '✅ group_messages already in realtime publication';
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Could not add group_messages to publication: %', SQLERRM;
END $$;

-- 4. Verify final status
SELECT 
  '✅ REALTIME ENABLED FOR:' as status,
  string_agg(tablename, ', ') as tables
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename IN ('direct_messages', 'group_messages');

-- ========================================
-- DONE! Now test:
-- 1. Send a media message in direct chat
-- 2. It should appear instantly for both sender and receiver
-- 3. Same for group chats
-- ========================================
