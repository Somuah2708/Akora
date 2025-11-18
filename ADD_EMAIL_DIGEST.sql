-- =============================================
-- EMAIL DIGEST SYSTEM
-- =============================================
-- This migration sets up email digest subscriptions and tracking
-- for weekly mentor/mentee summaries

-- Email digest subscriptions table
CREATE TABLE IF NOT EXISTS email_digest_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_type TEXT NOT NULL CHECK (digest_type IN ('mentor_weekly', 'mentee_weekly', 'admin_monthly')),
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  is_enabled BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, digest_type)
);

-- Email digest logs for tracking
CREATE TABLE IF NOT EXISTS email_digest_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  email_to TEXT NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  content_summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_digest_subscriptions_user ON email_digest_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_digest_subscriptions_enabled ON email_digest_subscriptions(is_enabled, digest_type);
CREATE INDEX IF NOT EXISTS idx_digest_logs_user_sent ON email_digest_logs(user_id, sent_at DESC);

-- RLS Policies
ALTER TABLE email_digest_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_digest_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON email_digest_subscriptions;
CREATE POLICY "Users can view their own subscriptions"
  ON email_digest_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscriptions" ON email_digest_subscriptions;
CREATE POLICY "Users can update their own subscriptions"
  ON email_digest_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON email_digest_subscriptions;
CREATE POLICY "Users can insert their own subscriptions"
  ON email_digest_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own logs" ON email_digest_logs;
CREATE POLICY "Users can view their own logs"
  ON email_digest_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Function to get mentor weekly digest data
CREATE OR REPLACE FUNCTION get_mentor_weekly_digest(mentor_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  digest_data JSONB;
  v_mentor_info JSONB;
  v_pending_requests JSONB;
  v_week_stats JSONB;
BEGIN
  -- Get mentor info with profile email
  SELECT jsonb_build_object(
    'full_name', am.full_name,
    'email', p.email,
    'total_mentees', am.total_mentees,
    'average_rating', am.average_rating,
    'total_ratings', am.total_ratings
  ) INTO v_mentor_info
  FROM alumni_mentors am
  JOIN profiles p ON p.id = am.user_id
  WHERE am.user_id = mentor_user_id;

  -- Get pending requests from last 7 days
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', mr.id,
      'mentee_name', p.full_name,
      'mentee_email', p.email,
      'message', mr.message,
      'requested_at', mr.created_at,
      'areas_of_interest', mr.areas_of_interest
    )
  ), '[]'::jsonb) INTO v_pending_requests
  FROM mentorship_requests mr
  JOIN profiles p ON p.id = mr.user_id
  WHERE mr.mentor_id = mentor_user_id
    AND mr.status = 'pending'
    AND mr.created_at >= NOW() - INTERVAL '7 days';

  -- Get weekly stats
  SELECT jsonb_build_object(
    'new_requests', COUNT(DISTINCT CASE WHEN mr.created_at >= NOW() - INTERVAL '7 days' AND mr.status = 'pending' THEN mr.id END),
    'accepted_requests', COUNT(DISTINCT CASE WHEN mr.created_at >= NOW() - INTERVAL '7 days' AND mr.status = 'accepted' THEN mr.id END),
    'total_pending', COUNT(DISTINCT CASE WHEN mr.status = 'pending' THEN mr.id END),
    'total_accepted', COUNT(DISTINCT CASE WHEN mr.status = 'accepted' THEN mr.id END),
    'new_favorites', COUNT(DISTINCT CASE WHEN mf.created_at >= NOW() - INTERVAL '7 days' THEN mf.id END),
    'total_favorites', COUNT(DISTINCT mf.id)
  ) INTO v_week_stats
  FROM alumni_mentors am
  LEFT JOIN mentorship_requests mr ON mr.mentor_id = am.user_id
  LEFT JOIN mentor_favorites mf ON mf.mentor_id = am.user_id
  WHERE am.user_id = mentor_user_id;

  -- Combine all data
  digest_data := jsonb_build_object(
    'mentor_info', v_mentor_info,
    'pending_requests', v_pending_requests,
    'week_stats', v_week_stats,
    'generated_at', NOW()
  );

  RETURN digest_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get mentee weekly digest data
CREATE OR REPLACE FUNCTION get_mentee_weekly_digest(mentee_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  digest_data JSONB;
  v_user_info JSONB;
  v_my_requests JSONB;
  v_recommendations JSONB;
BEGIN
  -- Get user info
  SELECT jsonb_build_object(
    'full_name', p.full_name,
    'email', p.email
  ) INTO v_user_info
  FROM profiles p
  WHERE p.id = mentee_user_id;

  -- Get user's requests from last 7 days
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', mr.id,
      'mentor_name', am.full_name,
      'mentor_title', am.current_title,
      'status', mr.status,
      'requested_at', mr.created_at
    )
  ), '[]'::jsonb) INTO v_my_requests
  FROM mentorship_requests mr
  JOIN alumni_mentors am ON am.user_id = mr.mentor_id
  WHERE mr.user_id = mentee_user_id
    AND mr.created_at >= NOW() - INTERVAL '7 days';

  -- Get top 3 recommended mentors (simple version based on ratings)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'mentor_id', am.user_id,
      'full_name', am.full_name,
      'current_title', am.current_title,
      'company', am.company,
      'expertise_areas', am.expertise_areas,
      'average_rating', am.average_rating
    )
  ), '[]'::jsonb) INTO v_recommendations
  FROM alumni_mentors am
  WHERE am.status = 'approved'
    AND am.is_available = true
  ORDER BY am.average_rating DESC NULLS LAST, am.total_ratings DESC
  LIMIT 3;

  -- Combine all data
  digest_data := jsonb_build_object(
    'user_info', v_user_info,
    'my_requests', v_my_requests,
    'recommendations', v_recommendations,
    'generated_at', NOW()
  );

  RETURN digest_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark digest as sent
CREATE OR REPLACE FUNCTION log_digest_sent(
  p_user_id UUID,
  p_digest_type TEXT,
  p_email_to TEXT,
  p_status TEXT DEFAULT 'sent',
  p_content_summary JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  -- Insert log
  INSERT INTO email_digest_logs (user_id, digest_type, email_to, status, content_summary, error_message)
  VALUES (p_user_id, p_digest_type, p_email_to, p_status, p_content_summary, p_error_message)
  RETURNING id INTO log_id;

  -- Update subscription last_sent_at only if sent successfully
  IF p_status = 'sent' THEN
    UPDATE email_digest_subscriptions
    SET last_sent_at = NOW(), updated_at = NOW()
    WHERE user_id = p_user_id AND digest_type = p_digest_type;
  END IF;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get users who should receive digest
CREATE OR REPLACE FUNCTION get_users_for_digest(p_digest_type TEXT)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  last_sent_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eds.user_id,
    p.email,
    p.full_name,
    eds.last_sent_at
  FROM email_digest_subscriptions eds
  JOIN profiles p ON p.id = eds.user_id
  WHERE eds.digest_type = p_digest_type
    AND eds.is_enabled = true
    AND (
      eds.last_sent_at IS NULL 
      OR eds.last_sent_at < NOW() - INTERVAL '6 days'  -- Send weekly
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON email_digest_subscriptions TO authenticated;
GRANT SELECT ON email_digest_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_mentor_weekly_digest TO authenticated;
GRANT EXECUTE ON FUNCTION get_mentee_weekly_digest TO authenticated;
GRANT EXECUTE ON FUNCTION log_digest_sent TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_for_digest TO authenticated;

-- Add comments
COMMENT ON TABLE email_digest_subscriptions IS 'User preferences for email digest subscriptions';
COMMENT ON TABLE email_digest_logs IS 'Log of sent email digests';
COMMENT ON FUNCTION get_mentor_weekly_digest IS 'Generate weekly digest data for a mentor';
COMMENT ON FUNCTION get_mentee_weekly_digest IS 'Generate weekly digest data for a mentee';
COMMENT ON FUNCTION log_digest_sent IS 'Log a sent email digest';
COMMENT ON FUNCTION get_users_for_digest IS 'Get list of users who should receive digest emails';
