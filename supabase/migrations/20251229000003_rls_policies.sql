-- Enable Row Level Security and add policies for presence and message status updates

-- PROFILES: allow users to read presence and update their own
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON profiles;
CREATE POLICY "profiles_select_all_authenticated"
ON profiles FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "profiles_update_own_presence" ON profiles;
CREATE POLICY "profiles_update_own_presence"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- DIRECT MESSAGES: allow participants to select, sender to insert, receiver to update status
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dm_select_participants" ON direct_messages;
CREATE POLICY "dm_select_participants"
ON direct_messages FOR SELECT
TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

DROP POLICY IF EXISTS "dm_insert_sender_only" ON direct_messages;
CREATE POLICY "dm_insert_sender_only"
ON direct_messages FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid());

-- Receiver can update delivered_at, read_at, is_read for their received messages
DROP POLICY IF EXISTS "dm_update_status_by_receiver" ON direct_messages;
CREATE POLICY "dm_update_status_by_receiver"
ON direct_messages FOR UPDATE
TO authenticated
USING (receiver_id = auth.uid())
WITH CHECK (receiver_id = auth.uid());

-- Optionally, allow sender to update their own messages (e.g., edits within a time window)
-- DROP POLICY IF EXISTS "dm_update_sender_optional" ON direct_messages;
-- CREATE POLICY "dm_update_sender_optional"
-- ON direct_messages FOR UPDATE
-- TO authenticated
-- USING (sender_id = auth.uid())
-- WITH CHECK (sender_id = auth.uid());
