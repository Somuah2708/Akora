-- Add RLS policies to allow users to delete their own messages
-- This is crucial for the unsend feature to work properly

-- ============================================
-- DIRECT MESSAGES DELETE POLICY
-- ============================================

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Users can delete their own direct messages" ON direct_messages;

-- Create new delete policy for direct messages
CREATE POLICY "Users can delete their own direct messages"
ON direct_messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);

-- ============================================
-- GROUP MESSAGES DELETE POLICY
-- ============================================

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Users can delete their own group messages" ON group_messages;

-- Create new delete policy for group messages
CREATE POLICY "Users can delete their own group messages"
ON group_messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);

-- ============================================
-- VERIFY POLICIES ARE ACTIVE
-- ============================================

-- Run this to verify the policies were created:
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('direct_messages', 'group_messages')
AND cmd = 'DELETE';

-- ============================================
-- ENABLE REALTIME FOR DELETE EVENTS
-- ============================================

-- Ensure REPLICA IDENTITY is set to FULL for both tables
-- This allows DELETE events to include the deleted row data
ALTER TABLE direct_messages REPLICA IDENTITY FULL;
ALTER TABLE group_messages REPLICA IDENTITY FULL;

-- ============================================
-- IMPORTANT: SUPABASE DASHBOARD CONFIGURATION
-- ============================================

-- After running this SQL, you MUST also:
-- 1. Go to Supabase Dashboard > Database > Replication
-- 2. Find 'direct_messages' table and enable it for replication
-- 3. Make sure DELETE events are enabled (check the checkbox)
-- 4. Find 'group_messages' table and enable it for replication  
-- 5. Make sure DELETE events are enabled (check the checkbox)
-- 6. Save changes

-- Without enabling replication in the dashboard, real-time DELETE events won't work!
