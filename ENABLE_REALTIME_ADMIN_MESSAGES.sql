-- Enable real-time for admin_messages table
-- This is REQUIRED for real-time subscriptions to work

-- Step 1: Enable real-time replication for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;

-- Step 2: Verify it's enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'admin_messages';

-- Expected result: Should show one row with admin_messages
-- If no rows returned, real-time is NOT enabled and subscriptions won't work
