-- Migration: Add Request Expiration System
-- Description: Auto-decline mentor requests after 7 days of no response
-- Created: 2025-11-17

-- Add expires_at column to mentor_requests
ALTER TABLE mentor_requests
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days');

-- Update existing requests to set expiration date
UPDATE mentor_requests
SET expires_at = created_at + INTERVAL '7 days'
WHERE expires_at IS NULL AND status = 'pending';

-- Create index for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_mentor_requests_expires_at 
ON mentor_requests(expires_at) 
WHERE status = 'pending';

-- Function to auto-decline expired requests
CREATE OR REPLACE FUNCTION expire_pending_requests()
RETURNS TABLE (
  expired_count INTEGER,
  request_ids UUID[]
) AS $$
DECLARE
  expired INTEGER := 0;
  expired_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  -- Update expired pending requests
  WITH expired_requests AS (
    UPDATE mentor_requests
    SET status = 'declined',
        mentor_response = 'This request has automatically expired after 7 days with no response from the mentor.',
        updated_at = NOW()
    WHERE status = 'pending'
      AND expires_at <= NOW()
    RETURNING id, mentee_id
  )
  SELECT array_agg(id), COUNT(*)::INTEGER
  INTO expired_ids, expired
  FROM expired_requests;
  
  -- Create notifications for mentees
  IF expired > 0 THEN
    INSERT INTO app_notifications (
      user_id,
      title,
      message,
      type,
      created_at
    )
    SELECT 
      mentee_id,
      'Request Expired',
      'Your mentorship request has automatically expired after 7 days with no response. Please try requesting another mentor.',
      'mentor_request',
      NOW()
    FROM mentor_requests
    WHERE id = ANY(expired_ids);
  END IF;
  
  RETURN QUERY SELECT expired, expired_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to extend request expiration (for pending requests)
CREATE OR REPLACE FUNCTION extend_request_expiration(
  request_id UUID,
  extension_days INTEGER DEFAULT 7
)
RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := FALSE;
BEGIN
  -- Validate extension days (max 14 days)
  IF extension_days < 1 OR extension_days > 14 THEN
    RAISE EXCEPTION 'Extension days must be between 1 and 14';
  END IF;
  
  -- Extend expiration for pending request
  UPDATE mentor_requests
  SET expires_at = expires_at + (extension_days || ' days')::INTERVAL,
      updated_at = NOW()
  WHERE id = request_id
    AND status = 'pending';
  
  IF FOUND THEN
    success := TRUE;
  END IF;
  
  RETURN success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to set expiration date on new requests
CREATE OR REPLACE FUNCTION set_request_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + INTERVAL '7 days';
  END IF;
  
  -- Clear expiration when request is no longer pending
  IF NEW.status != 'pending' AND OLD.status = 'pending' THEN
    NEW.expires_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_request_expiration ON mentor_requests;
CREATE TRIGGER trigger_set_request_expiration
  BEFORE INSERT OR UPDATE ON mentor_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_request_expiration();

-- View to show soon-to-expire requests
CREATE OR REPLACE VIEW mentor_requests_expiring_soon AS
SELECT 
  mr.id,
  mr.mentee_id,
  mr.mentee_name,
  mr.mentor_id,
  am.full_name as mentor_name,
  am.email as mentor_email,
  mr.areas_of_interest,
  mr.message,
  mr.created_at,
  mr.expires_at,
  EXTRACT(EPOCH FROM (mr.expires_at - NOW())) / 3600 as hours_until_expiration,
  ROUND(EXTRACT(EPOCH FROM (mr.expires_at - NOW())) / 86400) as days_until_expiration
FROM mentor_requests mr
JOIN alumni_mentors am ON mr.mentor_id = am.id
WHERE mr.status = 'pending'
  AND mr.expires_at IS NOT NULL
  AND mr.expires_at > NOW()
  AND mr.expires_at <= NOW() + INTERVAL '2 days'
ORDER BY mr.expires_at ASC;

-- Grant permissions
GRANT EXECUTE ON FUNCTION expire_pending_requests TO authenticated;
GRANT EXECUTE ON FUNCTION extend_request_expiration TO authenticated;
GRANT SELECT ON mentor_requests_expiring_soon TO authenticated;

-- Add comments
COMMENT ON COLUMN mentor_requests.expires_at IS 'Timestamp when pending request will auto-decline (7 days from creation)';
COMMENT ON FUNCTION expire_pending_requests IS 'Auto-decline all expired pending requests and notify mentees';
COMMENT ON FUNCTION extend_request_expiration IS 'Extend the expiration date of a pending request (max 14 days)';
COMMENT ON VIEW mentor_requests_expiring_soon IS 'Pending requests expiring within 2 days';

-- Note: You should set up a cron job or scheduled task to run expire_pending_requests() daily
-- Example with pg_cron extension:
-- SELECT cron.schedule('expire-requests', '0 2 * * *', 'SELECT expire_pending_requests();');
