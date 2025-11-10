-- Add circle-related notification types to the notifications table
-- This allows notifications for circle join requests, approvals, and rejections

-- Drop the existing check constraint
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the new check constraint with circle notification types
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'like', 
  'comment', 
  'follow', 
  'mention', 
  'post', 
  'friend_request', 
  'friend_accept',
  'circle_join_request',
  'circle_join_approved',
  'circle_join_rejected'
));

-- Verify the constraint was updated
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'notifications'::regclass 
AND conname = 'notifications_type_check';

-- Test by inserting a sample circle notification (optional - comment out if not needed)
-- INSERT INTO notifications (recipient_id, actor_id, type, content)
-- VALUES (
--   'YOUR_USER_ID_HERE',
--   'YOUR_USER_ID_HERE',
--   'circle_join_request',
--   'Test notification for circle join request'
-- );

COMMENT ON COLUMN notifications.type IS 'Type of notification: like, comment, follow, mention, post, friend_request, friend_accept, circle_join_request, circle_join_approved, circle_join_rejected';
