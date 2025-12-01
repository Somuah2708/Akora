-- Enable real-time for direct_messages table (including DELETE events)
-- This ensures that when a message is deleted, all connected clients receive the DELETE event

-- First, ensure the table has REPLICA IDENTITY set to FULL
-- This is required for DELETE events to include the old row data
ALTER TABLE direct_messages REPLICA IDENTITY FULL;

-- Enable real-time publication for direct_messages if not already enabled
-- (INSERT and UPDATE are usually enabled by default, but DELETE needs explicit configuration)
DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- Alternatively, if you want to be more specific:
-- ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;

-- Repeat for group_messages table
ALTER TABLE group_messages REPLICA IDENTITY FULL;

-- Verify the replica identity is set
-- Run this to check:
-- SELECT relname, relreplident FROM pg_class WHERE relname IN ('direct_messages', 'group_messages');
-- 'f' = FULL replica identity (includes all columns in replication)
-- 'd' = DEFAULT replica identity (only primary key)

COMMENT ON TABLE direct_messages IS 'Direct messages with full replica identity for real-time DELETE events';
COMMENT ON TABLE group_messages IS 'Group messages with full replica identity for real-time DELETE events';
