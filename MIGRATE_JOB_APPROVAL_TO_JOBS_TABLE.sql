-- =============================================
-- MIGRATE JOB APPROVAL SYSTEM TO JOBS TABLE
-- =============================================
-- This migration updates all job approval functions and triggers
-- to use the dedicated jobs table instead of products_services

-- ============================================
-- STEP 1: Update get_pending_jobs function
-- ============================================
-- Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_pending_jobs(UUID);

CREATE OR REPLACE FUNCTION get_pending_jobs(p_admin_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  company TEXT,
  location TEXT,
  price NUMERIC,
  image_url TEXT,
  category_name TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  creator_email TEXT
) AS $$
BEGIN
  -- Verify admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = p_admin_id AND can_approve_jobs = true
  ) THEN
    RAISE EXCEPTION 'User does not have permission to view pending jobs';
  END IF;
  
  RETURN QUERY
  SELECT 
    j.id,
    j.title,
    j.description,
    j.company,
    j.location,
    j.salary_min as price,
    j.image_url,
    j.job_type as category_name,
    j.created_at,
    j.user_id,
    COALESCE(j.contact_email, au.email) as creator_email
  FROM jobs j
  LEFT JOIN auth.users au ON j.user_id = au.id
  WHERE j.is_approved = false 
    AND j.rejection_reason IS NULL  -- Only show pending, not rejected
  ORDER BY j.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 2: Update approve_job function
-- ============================================
CREATE OR REPLACE FUNCTION approve_job(
  p_job_id UUID,
  p_admin_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_job_owner_id UUID;
  v_job_title TEXT;
BEGIN
  -- Verify admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = p_admin_id AND can_approve_jobs = true
  ) THEN
    RAISE EXCEPTION 'User does not have permission to approve jobs';
  END IF;
  
  -- Get job details
  SELECT user_id, title INTO v_job_owner_id, v_job_title
  FROM jobs
  WHERE id = p_job_id;
  
  IF v_job_owner_id IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  
  -- Update job to approved
  UPDATE jobs
  SET 
    is_approved = true,
    admin_reviewed_at = NOW(),
    admin_reviewed_by = p_admin_id,
    rejection_reason = NULL,
    updated_at = NOW()
  WHERE id = p_job_id;
  
  -- Create notification for job owner
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    created_at,
    is_read
  ) VALUES (
    v_job_owner_id,
    'job_approved',
    'Job Listing Approved',
    'Your job listing "' || v_job_title || '" has been approved and is now visible to all users.',
    NOW(),
    false
  );
  
  -- Log the action
  INSERT INTO job_approval_logs (
    job_id,
    admin_id,
    action,
    notes,
    created_at
  ) VALUES (
    p_job_id,
    p_admin_id,
    'approved',
    p_notes,
    NOW()
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 3: Update decline_job function
-- ============================================
-- Drop the existing function first (required when changing parameter names)
DROP FUNCTION IF EXISTS decline_job(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION decline_job(
  p_job_id UUID,
  p_admin_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_job_owner_id UUID;
  v_job_title TEXT;
BEGIN
  -- Verify admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = p_admin_id AND can_approve_jobs = true
  ) THEN
    RAISE EXCEPTION 'User does not have permission to decline jobs';
  END IF;
  
  -- Reason is required
  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;
  
  -- Get job details
  SELECT user_id, title INTO v_job_owner_id, v_job_title
  FROM jobs
  WHERE id = p_job_id;
  
  IF v_job_owner_id IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  
  -- Update job to rejected
  UPDATE jobs
  SET 
    is_approved = false,
    admin_reviewed_at = NOW(),
    admin_reviewed_by = p_admin_id,
    rejection_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_job_id;
  
  -- Create notification for job owner
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    created_at,
    is_read
  ) VALUES (
    v_job_owner_id,
    'job_rejected',
    'Job Listing Declined',
    'Your job listing "' || v_job_title || '" was not approved. Reason: ' || p_reason,
    NOW(),
    false
  );
  
  -- Log the action
  INSERT INTO job_approval_logs (
    job_id,
    admin_id,
    action,
    notes,
    created_at
  ) VALUES (
    p_job_id,
    p_admin_id,
    'declined',
    p_reason,
    NOW()
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: Update trigger for new job notifications
-- ============================================
-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trigger_notify_admins_new_job ON products_services;
DROP TRIGGER IF EXISTS trigger_notify_admins_new_job ON jobs;

-- Create function to notify admins of new jobs
CREATE OR REPLACE FUNCTION notify_admins_new_job()
RETURNS TRIGGER AS $$
DECLARE
  v_admin RECORD;
BEGIN
  -- Only notify for new pending jobs
  IF NEW.is_approved = false AND NEW.rejection_reason IS NULL THEN
    -- Notify all admins who can approve jobs
    FOR v_admin IN 
      SELECT user_id FROM admin_roles WHERE can_approve_jobs = true
    LOOP
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        created_at,
        is_read
      ) VALUES (
        v_admin.user_id,
        'new_job_pending',
        'New Job Pending Approval',
        'A new job listing "' || NEW.title || '" is awaiting your approval.',
        NOW(),
        false
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on jobs table
CREATE TRIGGER trigger_notify_admins_new_job
  AFTER INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_job();

-- ============================================
-- STEP 5: Update admin notification count
-- ============================================
CREATE OR REPLACE FUNCTION get_admin_notification_count(p_admin_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM jobs
  WHERE is_approved = false 
    AND rejection_reason IS NULL;
  
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 6: Update job_approval_logs if needed
-- ============================================
-- Update foreign key to reference jobs table
DO $$
BEGIN
  -- Check if job_approval_logs exists and has FK to products_services
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'job_approval_logs'
  ) THEN
    -- Try to drop old FK and add new one
    BEGIN
      ALTER TABLE job_approval_logs 
        DROP CONSTRAINT IF EXISTS job_approval_logs_job_id_fkey;
      
      -- Check if jobs table exists before adding FK
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'jobs'
      ) THEN
        ALTER TABLE job_approval_logs 
          ADD CONSTRAINT job_approval_logs_job_id_fkey 
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not update job_approval_logs FK: %', SQLERRM;
    END;
  END IF;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_pending_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION approve_job TO authenticated;
GRANT EXECUTE ON FUNCTION decline_job TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_notification_count TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Job approval system migrated to jobs table successfully!';
  RAISE NOTICE 'All approval functions now use the dedicated jobs table.';
END $$;
