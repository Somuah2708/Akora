-- Create comprehensive notifications system (Instagram-style)
-- This handles likes, comments, follows, mentions, and post notifications

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention', 'post', 'friend_request', 'friend_accept')),
  content TEXT, -- For comments or custom messages
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(recipient_id, type);
CREATE INDEX IF NOT EXISTS idx_notifications_actor ON notifications(actor_id);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = recipient_id);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Policy: System can insert notifications (we'll use service role for this)
CREATE POLICY "Anyone can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE recipient_id = p_user_id AND is_read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE recipient_id = p_user_id AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification (prevents duplicates)
CREATE OR REPLACE FUNCTION create_notification(
  p_recipient_id UUID,
  p_actor_id UUID,
  p_type TEXT,
  p_content TEXT DEFAULT NULL,
  p_post_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_existing_id UUID;
BEGIN
  -- Don't create notification if actor is recipient
  IF p_actor_id = p_recipient_id THEN
    RETURN NULL;
  END IF;

  -- For likes and follows, check if similar notification exists in last 24 hours
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create notification when someone likes a post
CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author_id UUID;
BEGIN
  -- Get post author
  SELECT user_id INTO v_post_author_id
  FROM posts
  WHERE id = NEW.post_id;

  -- Create notification
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_post_like ON post_likes;
CREATE TRIGGER trigger_notify_post_like
AFTER INSERT ON post_likes
FOR EACH ROW
EXECUTE FUNCTION notify_post_like();

-- Trigger: Create notification when someone comments on a post
CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author_id UUID;
BEGIN
  -- Get post author
  SELECT user_id INTO v_post_author_id
  FROM posts
  WHERE id = NEW.post_id;

  -- Create notification
  PERFORM create_notification(
    v_post_author_id,
    NEW.user_id,
    'comment',
    LEFT(NEW.content, 100), -- First 100 chars of comment
    NEW.post_id,
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_post_comment ON post_comments;
CREATE TRIGGER trigger_notify_post_comment
AFTER INSERT ON post_comments
FOR EACH ROW
EXECUTE FUNCTION notify_post_comment();

-- Trigger: Create notification when someone sends friend request
CREATE OR REPLACE FUNCTION notify_friend_request()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_friend_request ON friend_requests;
CREATE TRIGGER trigger_notify_friend_request
AFTER INSERT ON friend_requests
FOR EACH ROW
EXECUTE FUNCTION notify_friend_request();

-- Trigger: Create notification when friend request is accepted
CREATE OR REPLACE FUNCTION notify_friend_accept()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_friend_accept ON friend_requests;
CREATE TRIGGER trigger_notify_friend_accept
AFTER UPDATE ON friend_requests
FOR EACH ROW
EXECUTE FUNCTION notify_friend_accept();

-- Sample notifications for testing (optional - comment out if not needed)
-- INSERT INTO notifications (recipient_id, actor_id, type, content, created_at) 
-- SELECT 
--   (SELECT id FROM profiles LIMIT 1), 
--   (SELECT id FROM profiles OFFSET 1 LIMIT 1),
--   'like',
--   NULL,
--   NOW() - (random() * INTERVAL '7 days')
-- FROM generate_series(1, 5);

COMMENT ON TABLE notifications IS 'Stores user notifications for likes, comments, follows, mentions, and posts';
COMMENT ON FUNCTION create_notification IS 'Creates a notification with duplicate prevention';
COMMENT ON FUNCTION get_unread_notification_count IS 'Returns count of unread notifications for a user';
COMMENT ON FUNCTION mark_all_notifications_read IS 'Marks all user notifications as read';
