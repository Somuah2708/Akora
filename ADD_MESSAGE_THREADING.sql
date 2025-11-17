-- Migration: Add Message Threading to Mentor Requests
-- Description: Enable threaded conversations between mentee and mentor
-- Created: 2025-11-17

-- Create mentor_request_messages table for threaded conversations
CREATE TABLE IF NOT EXISTS mentor_request_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES mentor_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('mentee', 'mentor')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mentor_request_messages_request_id ON mentor_request_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_mentor_request_messages_sender_id ON mentor_request_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_mentor_request_messages_created_at ON mentor_request_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_request_messages_is_read ON mentor_request_messages(is_read) WHERE is_read = FALSE;

-- Add last_message_at to mentor_requests for sorting by recent activity
ALTER TABLE mentor_requests 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for last_message_at
CREATE INDEX IF NOT EXISTS idx_mentor_requests_last_message_at ON mentor_requests(last_message_at DESC);

-- Function to update last_message_at timestamp
CREATE OR REPLACE FUNCTION update_request_last_message_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mentor_requests
  SET last_message_at = NEW.created_at
  WHERE id = NEW.request_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update last_message_at when new message is added
DROP TRIGGER IF EXISTS trigger_update_last_message_timestamp ON mentor_request_messages;
CREATE TRIGGER trigger_update_last_message_timestamp
  AFTER INSERT ON mentor_request_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_request_last_message_timestamp();

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
  p_request_id UUID,
  p_user_id UUID,
  p_user_type TEXT
)
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Mark all unread messages in the request as read (except sender's own messages)
  UPDATE mentor_request_messages
  SET is_read = TRUE
  WHERE request_id = p_request_id
    AND sender_id != p_user_id
    AND is_read = FALSE;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for unread message counts per request
CREATE OR REPLACE VIEW mentor_request_unread_counts AS
SELECT 
  request_id,
  sender_type,
  COUNT(*) as unread_count
FROM mentor_request_messages
WHERE is_read = FALSE
GROUP BY request_id, sender_type;

-- RLS Policies for mentor_request_messages
ALTER TABLE mentor_request_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages from their own requests
CREATE POLICY "Users can view their request messages"
  ON mentor_request_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mentor_requests mr
      WHERE mr.id = request_id
        AND (mr.mentee_id = auth.uid() OR mr.mentor_id = (
          SELECT id FROM alumni_mentors WHERE email = (
            SELECT email FROM profiles WHERE id = auth.uid()
          )
        ))
    )
  );

-- Policy: Mentees can send messages to their own requests
CREATE POLICY "Mentees can send messages to their requests"
  ON mentor_request_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_type = 'mentee'
    AND EXISTS (
      SELECT 1 FROM mentor_requests
      WHERE id = request_id AND mentee_id = auth.uid()
    )
  );

-- Policy: Mentors can send messages to requests assigned to them
CREATE POLICY "Mentors can send messages to their requests"
  ON mentor_request_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_type = 'mentor'
    AND EXISTS (
      SELECT 1 FROM mentor_requests mr
      JOIN alumni_mentors am ON mr.mentor_id = am.id
      WHERE mr.id = request_id 
        AND am.email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  );

-- Policy: Users can update their own messages (for mark as read)
CREATE POLICY "Users can update message read status"
  ON mentor_request_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM mentor_requests mr
      WHERE mr.id = request_id
        AND (mr.mentee_id = auth.uid() OR mr.mentor_id = (
          SELECT id FROM alumni_mentors WHERE email = (
            SELECT email FROM profiles WHERE id = auth.uid()
          )
        ))
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON mentor_request_messages TO authenticated;
GRANT SELECT ON mentor_request_unread_counts TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_as_read TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE mentor_request_messages IS 'Threaded conversation messages between mentees and mentors for specific requests';
COMMENT ON COLUMN mentor_request_messages.sender_type IS 'Type of sender: mentee or mentor';
COMMENT ON COLUMN mentor_request_messages.is_read IS 'Whether the message has been read by the recipient';
COMMENT ON FUNCTION mark_messages_as_read IS 'Marks all messages in a request as read for a specific user';
