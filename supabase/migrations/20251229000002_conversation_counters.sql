-- Conversation counters and last message tracking without changing app schema

-- Table to store per-user conversation stats with each friend
CREATE TABLE IF NOT EXISTS conversation_stats (
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  last_message_id UUID,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_stats_user ON conversation_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_stats_friend ON conversation_stats(friend_id);

-- Helper function to upsert conversation_stats
CREATE OR REPLACE FUNCTION upsert_conversation_stat(p_user_id UUID, p_friend_id UUID, p_message_id UUID, p_created_at TIMESTAMPTZ, p_increment_unread BOOLEAN)
RETURNS VOID AS $$
BEGIN
  INSERT INTO conversation_stats (user_id, friend_id, last_message_id, last_message_at, unread_count)
  VALUES (p_user_id, p_friend_id, p_message_id, p_created_at, CASE WHEN p_increment_unread THEN 1 ELSE 0 END)
  ON CONFLICT (user_id, friend_id)
  DO UPDATE SET 
    last_message_id = EXCLUDED.last_message_id,
    last_message_at = EXCLUDED.last_message_at,
    unread_count = conversation_stats.unread_count + CASE WHEN p_increment_unread THEN 1 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- Trigger: after insert on direct_messages -> update last_message and unread counts
CREATE OR REPLACE FUNCTION trg_after_insert_direct_messages()
RETURNS TRIGGER AS $$
BEGIN
  -- Update sender's view (no unread increment)
  PERFORM upsert_conversation_stat(NEW.sender_id, NEW.receiver_id, NEW.id, NEW.created_at, FALSE);
  
  -- Update receiver's view (increment unread)
  PERFORM upsert_conversation_stat(NEW.receiver_id, NEW.sender_id, NEW.id, NEW.created_at, TRUE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_insert_direct_messages ON direct_messages;
CREATE TRIGGER after_insert_direct_messages
AFTER INSERT ON direct_messages
FOR EACH ROW EXECUTE FUNCTION trg_after_insert_direct_messages();

-- Trigger: after update set is_read true or read_at -> decrement unread for receiver
CREATE OR REPLACE FUNCTION trg_after_update_direct_messages()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.is_read = TRUE AND COALESCE(OLD.is_read, FALSE) = FALSE) OR (NEW.read_at IS NOT NULL AND OLD.read_at IS NULL) THEN
    UPDATE conversation_stats
    SET unread_count = GREATEST(unread_count - 1, 0),
        last_message_at = GREATEST(COALESCE(last_message_at, to_timestamp(0)), NEW.created_at),
        last_message_id = CASE WHEN COALESCE(last_message_at, to_timestamp(0)) <= NEW.created_at THEN NEW.id ELSE last_message_id END
    WHERE user_id = NEW.receiver_id AND friend_id = NEW.sender_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_update_direct_messages ON direct_messages;
CREATE TRIGGER after_update_direct_messages
AFTER UPDATE ON direct_messages
FOR EACH ROW EXECUTE FUNCTION trg_after_update_direct_messages();

-- Convenience view to fetch conversation list for a user ordered by last_message_at
CREATE OR REPLACE VIEW conversation_list AS
SELECT 
  cs.user_id,
  cs.friend_id,
  cs.last_message_id,
  cs.last_message_at,
  cs.unread_count,
  dm.message AS last_message,
  dm.message_type,
  dm.sender_id,
  dm.receiver_id
FROM conversation_stats cs
LEFT JOIN direct_messages dm ON dm.id = cs.last_message_id;
