-- Migration: Add Bulk Actions Support for Admin
-- Description: Functions for bulk approve/reject mentor applications and requests
-- Created: 2025-11-17

-- Function: Bulk approve mentor applications
CREATE OR REPLACE FUNCTION bulk_approve_applications(
  application_ids UUID[]
)
RETURNS TABLE (
  approved_count INTEGER,
  failed_count INTEGER,
  errors TEXT[]
) AS $$
DECLARE
  approved INTEGER := 0;
  failed INTEGER := 0;
  error_messages TEXT[] := ARRAY[]::TEXT[];
  app_id UUID;
BEGIN
  -- Loop through each application ID
  FOREACH app_id IN ARRAY application_ids
  LOOP
    BEGIN
      -- Update application status to approved
      UPDATE alumni_mentors
      SET status = 'approved',
          updated_at = NOW()
      WHERE id = app_id
        AND status = 'pending';
      
      IF FOUND THEN
        approved := approved + 1;
      ELSE
        failed := failed + 1;
        error_messages := array_append(error_messages, 
          'Application ' || app_id || ' not found or already processed');
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      failed := failed + 1;
      error_messages := array_append(error_messages, 
        'Error processing application ' || app_id || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT approved, failed, error_messages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Bulk reject mentor applications
CREATE OR REPLACE FUNCTION bulk_reject_applications(
  application_ids UUID[],
  rejection_reason TEXT DEFAULT 'Application did not meet requirements'
)
RETURNS TABLE (
  rejected_count INTEGER,
  failed_count INTEGER,
  errors TEXT[]
) AS $$
DECLARE
  rejected INTEGER := 0;
  failed INTEGER := 0;
  error_messages TEXT[] := ARRAY[]::TEXT[];
  app_id UUID;
BEGIN
  -- Loop through each application ID
  FOREACH app_id IN ARRAY application_ids
  LOOP
    BEGIN
      -- Update application status to rejected
      UPDATE alumni_mentors
      SET status = 'rejected',
          updated_at = NOW()
      WHERE id = app_id
        AND status = 'pending';
      
      IF FOUND THEN
        rejected := rejected + 1;
        
        -- Create notification for applicant
        INSERT INTO app_notifications (
          user_id,
          title,
          message,
          type,
          created_at
        )
        SELECT 
          user_id,
          'Application Update',
          'Your mentor application has been reviewed. ' || rejection_reason,
          'mentor_application',
          NOW()
        FROM alumni_mentors
        WHERE id = app_id AND user_id IS NOT NULL;
      ELSE
        failed := failed + 1;
        error_messages := array_append(error_messages,
          'Application ' || app_id || ' not found or already processed');
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      failed := failed + 1;
      error_messages := array_append(error_messages,
        'Error processing application ' || app_id || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT rejected, failed, error_messages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Bulk update mentor status (approve/inactive)
CREATE OR REPLACE FUNCTION bulk_update_mentor_status(
  mentor_ids UUID[],
  new_status TEXT
)
RETURNS TABLE (
  updated_count INTEGER,
  failed_count INTEGER,
  errors TEXT[]
) AS $$
DECLARE
  updated INTEGER := 0;
  failed INTEGER := 0;
  error_messages TEXT[] := ARRAY[]::TEXT[];
  mentor_id UUID;
BEGIN
  -- Validate status
  IF new_status NOT IN ('approved', 'inactive', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be approved, inactive, or rejected', new_status;
  END IF;
  
  -- Loop through each mentor ID
  FOREACH mentor_id IN ARRAY mentor_ids
  LOOP
    BEGIN
      UPDATE alumni_mentors
      SET status = new_status,
          updated_at = NOW()
      WHERE id = mentor_id;
      
      IF FOUND THEN
        updated := updated + 1;
      ELSE
        failed := failed + 1;
        error_messages := array_append(error_messages,
          'Mentor ' || mentor_id || ' not found');
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      failed := failed + 1;
      error_messages := array_append(error_messages,
        'Error processing mentor ' || mentor_id || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT updated, failed, error_messages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Bulk decline mentor requests
CREATE OR REPLACE FUNCTION bulk_decline_requests(
  request_ids UUID[],
  decline_reason TEXT DEFAULT 'Unable to accept at this time'
)
RETURNS TABLE (
  declined_count INTEGER,
  failed_count INTEGER,
  errors TEXT[]
) AS $$
DECLARE
  declined INTEGER := 0;
  failed INTEGER := 0;
  error_messages TEXT[] := ARRAY[]::TEXT[];
  req_id UUID;
BEGIN
  -- Loop through each request ID
  FOREACH req_id IN ARRAY request_ids
  LOOP
    BEGIN
      -- Update request status to declined
      UPDATE mentor_requests
      SET status = 'declined',
          mentor_response = decline_reason,
          responded_at = NOW(),
          updated_at = NOW()
      WHERE id = req_id
        AND status = 'pending';
      
      IF FOUND THEN
        declined := declined + 1;
        
        -- Create notification for mentee
        INSERT INTO app_notifications (
          user_id,
          title,
          message,
          type,
          created_at
        )
        SELECT 
          mentee_id,
          'Mentorship Request Update',
          'Your mentorship request has been declined. Reason: ' || decline_reason,
          'mentor_request',
          NOW()
        FROM mentor_requests
        WHERE id = req_id;
      ELSE
        failed := failed + 1;
        error_messages := array_append(error_messages,
          'Request ' || req_id || ' not found or already processed');
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      failed := failed + 1;
      error_messages := array_append(error_messages,
        'Error processing request ' || req_id || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT declined, failed, error_messages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Bulk complete mentor requests
CREATE OR REPLACE FUNCTION bulk_complete_requests(
  request_ids UUID[]
)
RETURNS TABLE (
  completed_count INTEGER,
  failed_count INTEGER,
  errors TEXT[]
) AS $$
DECLARE
  completed INTEGER := 0;
  failed INTEGER := 0;
  error_messages TEXT[] := ARRAY[]::TEXT[];
  req_id UUID;
BEGIN
  -- Loop through each request ID
  FOREACH req_id IN ARRAY request_ids
  LOOP
    BEGIN
      -- Update request status to completed
      UPDATE mentor_requests
      SET status = 'completed',
          updated_at = NOW()
      WHERE id = req_id
        AND status = 'accepted';
      
      IF FOUND THEN
        completed := completed + 1;
        
        -- Create notification for mentee
        INSERT INTO app_notifications (
          user_id,
          title,
          message,
          type,
          created_at
        )
        SELECT 
          mentee_id,
          'Mentorship Session Completed',
          'Your mentorship session has been marked as completed. Please rate your experience!',
          'mentor_request',
          NOW()
        FROM mentor_requests
        WHERE id = req_id;
      ELSE
        failed := failed + 1;
        error_messages := array_append(error_messages,
          'Request ' || req_id || ' not found or not in accepted status');
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      failed := failed + 1;
      error_messages := array_append(error_messages,
        'Error processing request ' || req_id || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT completed, failed, error_messages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Bulk delete mentor applications (admin only)
CREATE OR REPLACE FUNCTION bulk_delete_applications(
  application_ids UUID[]
)
RETURNS TABLE (
  deleted_count INTEGER,
  failed_count INTEGER,
  errors TEXT[]
) AS $$
DECLARE
  deleted INTEGER := 0;
  failed INTEGER := 0;
  error_messages TEXT[] := ARRAY[]::TEXT[];
  app_id UUID;
BEGIN
  -- Loop through each application ID
  FOREACH app_id IN ARRAY application_ids
  LOOP
    BEGIN
      DELETE FROM alumni_mentors
      WHERE id = app_id
        AND status IN ('rejected', 'pending');
      
      IF FOUND THEN
        deleted := deleted + 1;
      ELSE
        failed := failed + 1;
        error_messages := array_append(error_messages,
          'Application ' || app_id || ' not found or cannot be deleted (status: approved)');
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      failed := failed + 1;
      error_messages := array_append(error_messages,
        'Error deleting application ' || app_id || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT deleted, failed, error_messages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users (admin check in application layer)
GRANT EXECUTE ON FUNCTION bulk_approve_applications TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_reject_applications TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_mentor_status TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_decline_requests TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_complete_requests TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_delete_applications TO authenticated;

-- Add comments
COMMENT ON FUNCTION bulk_approve_applications IS 'Bulk approve multiple mentor applications at once';
COMMENT ON FUNCTION bulk_reject_applications IS 'Bulk reject multiple mentor applications with reason';
COMMENT ON FUNCTION bulk_update_mentor_status IS 'Bulk update mentor status (approved/inactive/rejected)';
COMMENT ON FUNCTION bulk_decline_requests IS 'Bulk decline multiple pending mentor requests';
COMMENT ON FUNCTION bulk_complete_requests IS 'Bulk mark accepted requests as completed';
COMMENT ON FUNCTION bulk_delete_applications IS 'Bulk delete rejected or pending applications (admin only)';
