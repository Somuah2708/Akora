/*
  # Fix chat policies infinite recursion

  1. Security Changes
    - Drop existing RLS policies that cause recursion
    - Create helper function to check chat membership
    - Recreate policies using the helper function to prevent recursion
    
  2. Changes Made
    - Remove recursive policies on chat_participants, chats, and messages
    - Add is_chat_member() function for safe membership checking
    - Implement new non-recursive policies for all chat-related tables
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view chats they participate in" ON chats;
DROP POLICY IF EXISTS "Users can view participants of their chats" ON chat_participants;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their chats" ON messages;

-- Create a helper function to check if a user is a member of a chat
CREATE OR REPLACE FUNCTION is_chat_member(chat_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_participants.chat_id = $1 
    AND chat_participants.user_id = $2
  );
$$;

-- Recreate policies using the helper function
CREATE POLICY "Users can view chats they participate in"
  ON chats
  FOR SELECT
  TO authenticated
  USING (is_chat_member(id, auth.uid()));

CREATE POLICY "Users can view participants of their chats"
  ON chat_participants
  FOR SELECT
  TO authenticated
  USING (is_chat_member(chat_id, auth.uid()));

CREATE POLICY "Users can view messages in their chats"
  ON messages
  FOR SELECT
  TO authenticated
  USING (is_chat_member(chat_id, auth.uid()));

CREATE POLICY "Users can send messages to their chats"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id 
    AND is_chat_member(chat_id, auth.uid())
  );