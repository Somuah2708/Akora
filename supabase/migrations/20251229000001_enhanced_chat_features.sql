-- Enhanced Chat Features Migration
-- Adds support for read receipts, last seen, online status, and conversations tracking

-- Add read_at timestamp to direct_messages
ALTER TABLE direct_messages 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Add last_seen and is_online to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;

-- Create index for faster online status queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen);

-- Create index for read status queries
CREATE INDEX IF NOT EXISTS idx_direct_messages_read_at ON direct_messages(read_at);

-- Add delivered_at timestamp for message delivery status
ALTER TABLE direct_messages 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_direct_messages_delivered_at ON direct_messages(delivered_at);

-- Function to update last_seen on user activity
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET last_seen = NOW(), is_online = TRUE 
  WHERE id = NEW.sender_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update last_seen when user sends a message
DROP TRIGGER IF EXISTS trigger_update_last_seen ON direct_messages;
CREATE TRIGGER trigger_update_last_seen
  AFTER INSERT ON direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_seen();

-- Function to mark user as offline after inactivity
-- (This should be called periodically or from the app)
CREATE OR REPLACE FUNCTION mark_inactive_users_offline()
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET is_online = FALSE 
  WHERE is_online = TRUE 
  AND last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the schema
COMMENT ON COLUMN direct_messages.read_at IS 'Timestamp when message was read by receiver';
COMMENT ON COLUMN direct_messages.delivered_at IS 'Timestamp when message was delivered to receiver device';
COMMENT ON COLUMN profiles.last_seen IS 'Last time user was active';
COMMENT ON COLUMN profiles.is_online IS 'Whether user is currently online';
