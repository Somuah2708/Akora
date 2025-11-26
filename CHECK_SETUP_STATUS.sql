-- Quick check to see what's already set up
-- Run these queries in Supabase SQL Editor to verify setup status

-- 1. Check if admin_messages table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'admin_messages';

-- 2. Check admin_messages columns (including media columns)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'admin_messages'
ORDER BY ordinal_position;

-- 3. Check if admin_conversations table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'admin_conversations';

-- 4. Check if chat-media storage bucket exists
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'chat-media';

-- Expected results:
-- If admin_messages exists: Table should show
-- If media columns exist: media_url and media_type columns should appear
-- If admin_conversations exists: Table should show
-- If bucket exists: chat-media should show with public = true
