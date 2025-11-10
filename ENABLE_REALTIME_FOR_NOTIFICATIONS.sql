-- Enable Realtime for notifications table
-- Run this in Supabase SQL Editor to enable real-time subscriptions

-- Step 1: Check current realtime status
SELECT schemaname, tablename,
       EXISTS (
         SELECT 1 
         FROM pg_publication_tables 
         WHERE schemaname = 'public' 
         AND tablename = 'notifications'
       ) as is_realtime_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'notifications';

-- Step 2: Enable realtime replication for notifications table
-- This allows real-time subscriptions to work
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Step 3: Verify it's enabled
SELECT * FROM pg_publication_tables WHERE tablename = 'notifications';

-- You should see a row with:
-- pubname: supabase_realtime
-- schemaname: public  
-- tablename: notifications

-- Step 4: Test if realtime is working
-- After running this, any INSERT into notifications should broadcast in real-time
-- Try inserting a test notification and check if your app receives it immediately

COMMENT ON TABLE notifications IS 'Real-time enabled for instant notification delivery';
