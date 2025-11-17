-- =============================================
-- REQUEST CANCELLATION SYSTEM
-- =============================================
-- Adds cancellation functionality for pending mentorship requests
-- Tracks cancellation reasons and timestamps for analytics

-- Add cancellation columns to mentor_requests
ALTER TABLE mentor_requests
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_category VARCHAR(50);

-- Add index for cancelled requests queries
CREATE INDEX IF NOT EXISTS idx_mentor_requests_cancelled 
ON mentor_requests(cancelled_at) 
WHERE cancelled_at IS NOT NULL;

-- Add check constraint for cancellation category
ALTER TABLE mentor_requests
DROP CONSTRAINT IF EXISTS check_cancellation_category;

ALTER TABLE mentor_requests
ADD CONSTRAINT check_cancellation_category
CHECK (
  cancellation_category IS NULL OR
  cancellation_category IN (
    'found_another_mentor',
    'no_longer_needed',
    'scheduling_conflict',
    'changed_mind',
    'no_response',
    'other'
  )
);

-- Note: The status column is TEXT/VARCHAR, not an enum type
-- No need to alter enum - the 'cancelled' value can be used directly

-- Function to cancel a request
CREATE OR REPLACE FUNCTION cancel_mentor_request(
  request_id UUID,
  user_id UUID,
  reason TEXT,
  category VARCHAR(50)
)
RETURNS JSONB AS $$
DECLARE
  request_record RECORD;
  result JSONB;
BEGIN
  -- Get the request
  SELECT * INTO request_record
  FROM mentor_requests
  WHERE id = request_id;

  -- Check if request exists
  IF request_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Request not found'
    );
  END IF;

  -- Check if user is the mentee
  IF request_record.mentee_id != user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Only the mentee can cancel this request'
    );
  END IF;

  -- Check if request is already cancelled, completed, or declined
  IF request_record.status IN ('cancelled', 'completed', 'declined') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot cancel a request that is ' || request_record.status
    );
  END IF;

  -- Update the request
  UPDATE mentor_requests
  SET
    status = 'cancelled',
    cancelled_at = NOW(),
    cancelled_by = user_id,
    cancellation_reason = reason,
    cancellation_category = category
  WHERE id = request_id;

  -- Create notification for mentor (if request was accepted)
  IF request_record.status = 'accepted' THEN
    INSERT INTO app_notifications (
      user_id,
      type,
      title,
      message,
      reference_id,
      reference_type
    )
    SELECT
      am.user_id,
      'request_cancelled',
      'Mentorship Request Cancelled',
      format(
        '%s has cancelled their mentorship request. Reason: %s',
        request_record.mentee_name,
        COALESCE(reason, 'No reason provided')
      ),
      request_id,
      'mentor_request'
    FROM alumni_mentors am
    WHERE am.id = request_record.mentor_id
    AND am.user_id IS NOT NULL;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Request cancelled successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy: Allow mentees to cancel their own pending/accepted requests
CREATE POLICY "Mentees can cancel their own requests"
ON mentor_requests
FOR UPDATE
TO authenticated
USING (
  mentee_id = auth.uid()
  AND status IN ('pending', 'accepted')
)
WITH CHECK (
  mentee_id = auth.uid()
  AND status = 'cancelled'
);

-- Add helpful comments
COMMENT ON COLUMN mentor_requests.cancelled_at IS 'Timestamp when request was cancelled';
COMMENT ON COLUMN mentor_requests.cancelled_by IS 'User who cancelled the request (should be mentee)';
COMMENT ON COLUMN mentor_requests.cancellation_reason IS 'Free text explanation for cancellation';
COMMENT ON COLUMN mentor_requests.cancellation_category IS 'Categorized reason for analytics: found_another_mentor, no_longer_needed, scheduling_conflict, changed_mind, no_response, other';
COMMENT ON FUNCTION cancel_mentor_request IS 'Safely cancels a mentorship request with validation and notifications';
