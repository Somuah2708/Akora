-- ================================================
-- IMPORTANT: Run this SQL in your Supabase Dashboard
-- ================================================
-- This migration adds 'document' as a valid message type
-- for both direct_messages and group_messages tables
-- ================================================

-- Step 1: Drop existing constraints
ALTER TABLE direct_messages DROP CONSTRAINT IF EXISTS direct_messages_message_type_check;
ALTER TABLE group_messages DROP CONSTRAINT IF EXISTS group_messages_message_type_check;

-- Step 2: Add new constraints with document type
ALTER TABLE direct_messages 
ADD CONSTRAINT direct_messages_message_type_check 
CHECK (message_type IN ('text', 'image', 'video', 'voice', 'document'));

ALTER TABLE group_messages 
ADD CONSTRAINT group_messages_message_type_check 
CHECK (message_type IN ('text', 'image', 'video', 'voice', 'document'));

-- Step 3: Verify the constraints were created
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname IN ('direct_messages_message_type_check', 'group_messages_message_type_check');

-- ================================================
-- After running this, you should see output like:
-- direct_messages_message_type_check | CHECK ((message_type = ANY (ARRAY['text'::text, 'image'::text, 'video'::text, 'voice'::text, 'document'::text])))
-- group_messages_message_type_check | CHECK ((message_type = ANY (ARRAY['text'::text, 'image'::text, 'video'::text, 'voice'::text, 'document'::text])))
-- ================================================
