-- =============================================
-- PUSH NOTIFICATIONS SYSTEM
-- =============================================
-- Store push notification tokens and notification preferences
-- for real-time alerts on mentorship activities

-- Push notification tokens table
CREATE TABLE IF NOT EXISTS push_notification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type TEXT CHECK (device_type IN ('ios', 'android', 'web')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Mentee notifications
  request_accepted BOOLEAN DEFAULT true,
  request_declined BOOLEAN DEFAULT true,
  session_scheduled BOOLEAN DEFAULT true,
  session_reminder BOOLEAN DEFAULT true,
  new_message BOOLEAN DEFAULT true,
  mentor_recommendation BOOLEAN DEFAULT true,
  
  -- Mentor notifications
  new_request BOOLEAN DEFAULT true,
  request_cancelled BOOLEAN DEFAULT true,
  session_cancelled BOOLEAN DEFAULT true,
  mentee_message BOOLEAN DEFAULT true,
  rating_received BOOLEAN DEFAULT true,
  
  -- General
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification history table
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  delivery_status TEXT CHECK (delivery_status IN ('sent', 'delivered', 'failed', 'read', 'clicked')),
  error_message TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_notification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_notification_tokens(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_user ON notification_history(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_history_unread ON notification_history(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notification_history_type ON notification_history(notification_type, sent_at DESC);

-- RLS Policies
ALTER TABLE push_notification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own tokens" ON push_notification_tokens;
CREATE POLICY "Users can manage their own tokens"
  ON push_notification_tokens
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own preferences" ON notification_preferences;
CREATE POLICY "Users can manage their own preferences"
  ON notification_preferences
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own notifications" ON notification_history;
CREATE POLICY "Users can view their own notifications"
  ON notification_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their notification status" ON notification_history;
CREATE POLICY "Users can update their notification status"
  ON notification_history FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to register push notification token
CREATE OR REPLACE FUNCTION register_push_token(
  p_user_id UUID,
  p_token TEXT,
  p_device_type TEXT
)
RETURNS UUID AS $$
DECLARE
  v_token_id UUID;
BEGIN
  -- Deactivate old tokens for this user on the same device type
  UPDATE push_notification_tokens
  SET is_active = false
  WHERE user_id = p_user_id 
    AND device_type = p_device_type
    AND token != p_token;

  -- Insert or update the token
  INSERT INTO push_notification_tokens (user_id, token, device_type, is_active, updated_at, last_used_at)
  VALUES (p_user_id, p_token, p_device_type, true, NOW(), NOW())
  ON CONFLICT (user_id, token)
  DO UPDATE SET
    is_active = true,
    device_type = EXCLUDED.device_type,
    updated_at = NOW(),
    last_used_at = NOW()
  RETURNING id INTO v_token_id;

  -- Initialize notification preferences if they don't exist
  INSERT INTO notification_preferences (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN v_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active tokens for a user
CREATE OR REPLACE FUNCTION get_user_push_tokens(p_user_id UUID)
RETURNS TABLE (
  token TEXT,
  device_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT pnt.token, pnt.device_type
  FROM push_notification_tokens pnt
  WHERE pnt.user_id = p_user_id
    AND pnt.is_active = true
  ORDER BY pnt.last_used_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user should receive notification
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_prefs RECORD;
  v_current_time TIME;
  v_should_send BOOLEAN := true;
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;

  -- If no preferences, return true (send by default)
  IF v_prefs IS NULL THEN
    RETURN true;
  END IF;

  -- Check if push notifications are enabled
  IF v_prefs.push_enabled = false THEN
    RETURN false;
  END IF;

  -- Check quiet hours
  IF v_prefs.quiet_hours_start IS NOT NULL AND v_prefs.quiet_hours_end IS NOT NULL THEN
    v_current_time := CURRENT_TIME;
    IF v_prefs.quiet_hours_start < v_prefs.quiet_hours_end THEN
      -- Normal range (e.g., 22:00 to 07:00)
      IF v_current_time >= v_prefs.quiet_hours_start AND v_current_time <= v_prefs.quiet_hours_end THEN
        RETURN false;
      END IF;
    ELSE
      -- Overnight range (e.g., 22:00 to 07:00)
      IF v_current_time >= v_prefs.quiet_hours_start OR v_current_time <= v_prefs.quiet_hours_end THEN
        RETURN false;
      END IF;
    END IF;
  END IF;

  -- Check type-specific preferences
  v_should_send := CASE p_notification_type
    WHEN 'request_accepted' THEN v_prefs.request_accepted
    WHEN 'request_declined' THEN v_prefs.request_declined
    WHEN 'session_scheduled' THEN v_prefs.session_scheduled
    WHEN 'session_reminder' THEN v_prefs.session_reminder
    WHEN 'new_message' THEN v_prefs.new_message
    WHEN 'mentor_recommendation' THEN v_prefs.mentor_recommendation
    WHEN 'new_request' THEN v_prefs.new_request
    WHEN 'request_cancelled' THEN v_prefs.request_cancelled
    WHEN 'session_cancelled' THEN v_prefs.session_cancelled
    WHEN 'mentee_message' THEN v_prefs.mentee_message
    WHEN 'rating_received' THEN v_prefs.rating_received
    ELSE true
  END;

  RETURN v_should_send;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log notification
CREATE OR REPLACE FUNCTION log_notification(
  p_user_id UUID,
  p_notification_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT NULL,
  p_delivery_status TEXT DEFAULT 'sent'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notification_history (
    user_id,
    notification_type,
    title,
    body,
    data,
    delivery_status
  )
  VALUES (
    p_user_id,
    p_notification_type,
    p_title,
    p_body,
    p_data,
    p_delivery_status
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notification_history
  SET read_at = NOW(),
      delivery_status = 'read'
  WHERE id = p_notification_id
    AND read_at IS NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as clicked
CREATE OR REPLACE FUNCTION mark_notification_clicked(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notification_history
  SET clicked_at = NOW(),
      delivery_status = 'clicked',
      read_at = COALESCE(read_at, NOW())
  WHERE id = p_notification_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM notification_history
  WHERE user_id = p_user_id
    AND read_at IS NULL;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent notifications
CREATE OR REPLACE FUNCTION get_recent_notifications(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  notification_type TEXT,
  title TEXT,
  body TEXT,
  data JSONB,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  delivery_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nh.id,
    nh.notification_type,
    nh.title,
    nh.body,
    nh.data,
    nh.sent_at,
    nh.read_at,
    nh.clicked_at,
    nh.delivery_status
  FROM notification_history nh
  WHERE nh.user_id = p_user_id
  ORDER BY nh.sent_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON push_notification_tokens TO authenticated;
GRANT ALL ON notification_preferences TO authenticated;
GRANT SELECT, UPDATE ON notification_history TO authenticated;
GRANT EXECUTE ON FUNCTION register_push_token TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_push_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION should_send_notification TO authenticated;
GRANT EXECUTE ON FUNCTION log_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_clicked TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_notifications TO authenticated;

-- Add comments
COMMENT ON TABLE push_notification_tokens IS 'Expo push notification tokens for users';
COMMENT ON TABLE notification_preferences IS 'User notification preferences and quiet hours';
COMMENT ON TABLE notification_history IS 'History of all sent notifications';
COMMENT ON FUNCTION register_push_token IS 'Register or update a push notification token';
COMMENT ON FUNCTION should_send_notification IS 'Check if notification should be sent based on user preferences';
COMMENT ON FUNCTION log_notification IS 'Log a sent notification to history';
COMMENT ON FUNCTION mark_notification_read IS 'Mark notification as read';
COMMENT ON FUNCTION get_unread_notification_count IS 'Get count of unread notifications';
