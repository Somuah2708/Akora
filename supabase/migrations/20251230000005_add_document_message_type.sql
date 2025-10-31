/*
  # Add Document Message Type
  
  1. Updates
    - Add 'document' to message_type CHECK constraint for direct_messages
    - Add 'document' to message_type CHECK constraint for group_messages
*/

-- Drop existing constraints
ALTER TABLE direct_messages DROP CONSTRAINT IF EXISTS direct_messages_message_type_check;
ALTER TABLE group_messages DROP CONSTRAINT IF EXISTS group_messages_message_type_check;

-- Add new constraints with document type
ALTER TABLE direct_messages 
ADD CONSTRAINT direct_messages_message_type_check 
CHECK (message_type IN ('text', 'image', 'video', 'voice', 'document'));

ALTER TABLE group_messages 
ADD CONSTRAINT group_messages_message_type_check 
CHECK (message_type IN ('text', 'image', 'video', 'voice', 'document'));
