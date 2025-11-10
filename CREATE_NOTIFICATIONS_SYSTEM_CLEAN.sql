-- Clean installation of notifications system
-- Run this if you're getting errors with the previous script

-- Drop existing objects (if any)
DROP TRIGGER IF EXISTS trigger_notify_friend_accept ON friend_requests;
DROP TRIGGER IF EXISTS trigger_notify_friend_request ON friend_requests;
DROP TRIGGER IF EXISTS trigger_notify_post_comment ON post_comments;
DROP TRIGGER IF EXISTS trigger_notify_post_like ON post_likes;

DROP FUNCTION IF EXISTS notify_friend_accept();
DROP FUNCTION IF EXISTS notify_friend_request();
DROP FUNCTION IF EXISTS notify_post_comment();
DROP FUNCTION IF EXISTS notify_post_like();
DROP FUNCTION IF EXISTS create_notification(UUID, UUID, TEXT, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS mark_all_notifications_read(UUID);
DROP FUNCTION IF EXISTS get_unread_notification_count(UUID);

DROP TABLE IF EXISTS notifications CASCADE;

-- Create notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention', 'post', 'friend_request', 'friend_accept')),
  content TEXT,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications(recipient_id, type);
CREATE INDEX idx_notifications_actor ON notifications(actor_id);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = recipient_id);

CREATE POLICY "Anyone can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Helper function: Get unread count
CREATE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE recipient_id = p_user_id AND is_read = false
  );
END;
$$;

-- Helper function: Mark all as read
CREATE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE recipient_id = p_user_id AND is_read = false;
END;
$$;

-- Core function: Create notification with duplicate prevention
CREATE FUNCTION create_notification(
  p_recipient_id UUID,
  p_actor_id UUID,
  p_type TEXT,
  p_content TEXT DEFAULT NULL,
  p_post_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
  v_existing_id UUID;
BEGIN
  -- Don't create notification if actor is recipient
  IF p_actor_id = p_recipient_id THEN
    RETURN NULL;
  END IF;

  -- For likes and follows, check for duplicates in last 24 hours
  IF p_type IN ('like', 'follow') THEN
    SELECT id INTO v_existing_id
    FROM notifications
    WHERE recipient_id = p_recipient_id
      AND actor_id = p_actor_id
      AND type = p_type
      AND (p_post_id IS NULL OR post_id = p_post_id)
      AND created_at > NOW() - INTERVAL '24 hours'
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      -- Update timestamp instead of creating duplicate
      UPDATE notifications
      SET created_at = NOW(), is_read = false
      WHERE id = v_existing_id;
      RETURN v_existing_id;
    END IF;
  END IF;

  -- Create new notification
  INSERT INTO notifications (recipient_id, actor_id, type, content, post_id, comment_id)
  VALUES (p_recipient_id, p_actor_id, p_type, p_content, p_post_id, p_comment_id)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Trigger function: Post like notifications
CREATE FUNCTION notify_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_post_author_id UUID;
BEGIN
  SELECT user_id INTO v_post_author_id
  FROM posts
  WHERE id = NEW.post_id;

  PERFORM create_notification(
    v_post_author_id,
    NEW.user_id,
    'like',
    NULL,
    NEW.post_id,
    NULL
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_post_like
AFTER INSERT ON post_likes
FOR EACH ROW
EXECUTE FUNCTION notify_post_like();

-- Trigger function: Post comment notifications
CREATE FUNCTION notify_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_post_author_id UUID;
BEGIN
  SELECT user_id INTO v_post_author_id
  FROM posts
  WHERE id = NEW.post_id;

  PERFORM create_notification(
    v_post_author_id,
    NEW.user_id,
    'comment',
    LEFT(NEW.content, 100),
    NEW.post_id,
    NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_post_comment
AFTER INSERT ON post_comments
FOR EACH ROW
EXECUTE FUNCTION notify_post_comment();

-- Trigger function: Friend request notifications
CREATE FUNCTION notify_friend_request()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM create_notification(
      NEW.receiver_id,
      NEW.sender_id,
      'friend_request',
      NULL,
      NULL,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_friend_request
AFTER INSERT ON friend_requests
FOR EACH ROW
EXECUTE FUNCTION notify_friend_request();

-- Trigger function: Friend accept notifications
CREATE FUNCTION notify_friend_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    PERFORM create_notification(
      NEW.sender_id,
      NEW.receiver_id,
      'friend_accept',
      NULL,
      NULL,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_friend_accept
AFTER UPDATE ON friend_requests
FOR EACH ROW
EXECUTE FUNCTION notify_friend_accept();

-- Add comments
COMMENT ON TABLE notifications IS 'Stores user notifications for likes, comments, follows, mentions, and posts';
COMMENT ON FUNCTION create_notification IS 'Creates a notification with duplicate prevention';
COMMENT ON FUNCTION get_unread_notification_count IS 'Returns count of unread notifications for a user';
COMMENT ON FUNCTION mark_all_notifications_read IS 'Marks all user notifications as read';

-- ⚡ CRITICAL: Enable Real-Time Replication
-- This is required for badge count to update instantly
-- Without this, subscriptions connect but receive no events
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Verify realtime is enabled
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'notifications';

-- Should return 1 row showing notifications is replicated
-- If this returns empty, realtime is NOT enabled
