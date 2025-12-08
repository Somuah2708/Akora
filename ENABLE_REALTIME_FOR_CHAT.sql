-- =====================================================
-- ENABLE REALTIME FOR ALL CHAT & MESSAGING TABLES
-- =====================================================
-- This ensures messages, notifications, and friend requests
-- are delivered instantly across all devices
-- =====================================================

-- ✅ REALTIME IS ALREADY ENABLED FOR ALL TABLES
-- The supabase_realtime publication is set to FOR ALL TABLES
-- This means direct_messages, notifications, friend_requests, etc.
-- are automatically included in realtime updates

-- Verify realtime publication configuration:
SELECT pubname, puballtables 
FROM pg_publication 
WHERE pubname = 'supabase_realtime';
-- Expected: pubname = 'supabase_realtime', puballtables = true

-- Note: If you need to add specific tables instead, you would:
-- 1. Recreate the publication without FOR ALL TABLES
-- 2. Add specific tables one by one
-- But since FOR ALL TABLES is enabled, no action needed here!

-- =====================================================
-- VERIFY REPLICA IDENTITY FOR REALTIME UPDATES
-- =====================================================
-- This ensures UPDATE and DELETE events work properly
-- =====================================================

-- Set replica identity to FULL for direct_messages (to track read/delivered status)
ALTER TABLE direct_messages REPLICA IDENTITY FULL;

-- Set replica identity to FULL for admin_messages
ALTER TABLE admin_messages REPLICA IDENTITY FULL;

-- Set replica identity to FULL for notifications (to track read status)
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Set replica identity to FULL for friend_requests (to track status changes)
ALTER TABLE friend_requests REPLICA IDENTITY FULL;

-- Set replica identity to FULL for friends table (bidirectional friendships)
ALTER TABLE friends REPLICA IDENTITY FULL;

-- =====================================================
-- GRANT REALTIME PERMISSIONS
-- =====================================================
-- Ensure authenticated users can receive realtime updates
-- =====================================================

-- Grant SELECT permission for realtime (required to receive updates)
GRANT SELECT ON direct_messages TO authenticated;
GRANT SELECT ON admin_messages TO authenticated;
GRANT SELECT ON admin_conversations TO authenticated;
GRANT SELECT ON notifications TO authenticated;
GRANT SELECT ON friend_requests TO authenticated;
GRANT SELECT ON friends TO authenticated;

-- Note: INSERT, UPDATE, DELETE permissions should already be 
-- handled by your existing RLS policies

-- =====================================================
-- CREATE INDEXES FOR REALTIME PERFORMANCE
-- =====================================================
-- These indexes speed up realtime filtering and queries
-- =====================================================

-- Index for filtering direct messages by conversation participants
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation 
ON direct_messages(sender_id, receiver_id);

-- Index for filtering direct messages by receiver (for new message notifications)
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver 
ON direct_messages(receiver_id, created_at DESC);

-- Index for filtering direct messages by sender
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender 
ON direct_messages(sender_id, created_at DESC);

-- Index for unread messages
CREATE INDEX IF NOT EXISTS idx_direct_messages_unread 
ON direct_messages(receiver_id) WHERE is_read = false;

-- Index for notifications by recipient
CREATE INDEX IF NOT EXISTS idx_notifications_recipient 
ON notifications(recipient_id, created_at DESC);

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
ON notifications(recipient_id) WHERE is_read = false;

-- Index for friend requests by receiver
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver 
ON friend_requests(receiver_id, status);

-- Index for friend requests by sender
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender 
ON friend_requests(sender_id, status);

-- Index for friends table lookup (bidirectional)
CREATE INDEX IF NOT EXISTS idx_friends_user_id 
ON friends(user_id);

CREATE INDEX IF NOT EXISTS idx_friends_friend_id 
ON friends(friend_id);

-- Index for admin messages by user
CREATE INDEX IF NOT EXISTS idx_admin_messages_user 
ON admin_messages(user_id, created_at DESC);

-- =====================================================
-- VERIFY REALTIME IS ENABLED
-- =====================================================

-- 1. Verify realtime publication includes all tables
SELECT pubname, puballtables 
FROM pg_publication 
WHERE pubname = 'supabase_realtime';
-- Expected: puballtables = true

-- 2. Check which tables have RLS enabled (required for realtime to work)
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN (
  'direct_messages', 
  'admin_messages', 
  'admin_conversations',
  'notifications', 
  'friend_requests',
  'friends'
)
ORDER BY tablename;
-- All should have rowsecurity = true

-- 3. Verify replica identity is set correctly
SELECT n.nspname as schemaname, c.relname as tablename, c.relreplident
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname IN (
  'direct_messages', 
  'admin_messages', 
  'notifications', 
  'friend_requests',
  'friends'
)
ORDER BY c.relname;
-- relreplident should be 'f' (FULL) for UPDATE tracking
