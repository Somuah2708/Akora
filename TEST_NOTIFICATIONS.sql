-- Test queries for notifications system
-- Run these to verify everything is working

-- 1. Check if notifications table exists and is empty
SELECT COUNT(*) as notification_count FROM notifications;

-- 2. Test get_unread_notification_count function
-- Replace 'YOUR_USER_ID' with an actual user ID from your profiles table
SELECT get_unread_notification_count('YOUR_USER_ID');

-- 3. Test create_notification function
-- This should create a test notification
-- Replace the UUIDs with actual user IDs from your profiles table
SELECT create_notification(
  'RECIPIENT_USER_ID'::UUID,  -- Who receives the notification
  'ACTOR_USER_ID'::UUID,       -- Who triggered it
  'like',                       -- Type
  NULL,                         -- Content (optional)
  NULL,                         -- Post ID (optional)
  NULL                          -- Comment ID (optional)
);

-- 4. Check if notification was created
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;

-- 5. Test mark_all_notifications_read function
-- Replace 'YOUR_USER_ID' with your user ID
SELECT mark_all_notifications_read('YOUR_USER_ID');

-- 6. Verify all notifications are marked as read
SELECT * FROM notifications WHERE recipient_id = 'YOUR_USER_ID';

-- 7. Check if triggers exist
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE 'trigger_notify%';

-- 8. Get all helper functions
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%notification%';
