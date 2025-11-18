-- =============================================
-- JOB APPROVAL SYSTEM
-- =============================================
-- Manages job posting approvals with admin notifications
-- and email confirmations to job creators

-- Add approval tracking columns to products_services if not exists
ALTER TABLE products_services 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'declined'));

ALTER TABLE products_services 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

ALTER TABLE products_services 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE products_services 
ADD COLUMN IF NOT EXISTS approval_notes TEXT;

ALTER TABLE products_services 
ADD COLUMN IF NOT EXISTS creator_email TEXT;

-- Update existing is_approved column to work with new system
UPDATE products_services 
SET approval_status = CASE 
  WHEN is_approved = true THEN 'approved'
  ELSE 'pending'
END
WHERE approval_status IS NULL;

-- Job approval notifications table
CREATE TABLE IF NOT EXISTS job_approval_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES products_services(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES auth.users(id),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('new_job', 'approved', 'declined')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  UNIQUE(job_id, admin_user_id, notification_type)
);

-- Admin roles table to track who can approve jobs
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'moderator', 'approver')),
  can_approve_jobs BOOLEAN DEFAULT true,
  receive_job_notifications BOOLEAN DEFAULT true,
  notification_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_approval_status ON products_services(approval_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_notifications_admin ON job_approval_notifications(admin_user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_job_notifications_job ON job_approval_notifications(job_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_user ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_can_approve ON admin_roles(can_approve_jobs) WHERE can_approve_jobs = true;

-- RLS Policies
ALTER TABLE job_approval_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view job notifications" ON job_approval_notifications;
CREATE POLICY "Admins can view job notifications"
  ON job_approval_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE user_id = auth.uid() AND can_approve_jobs = true
    )
  );

DROP POLICY IF EXISTS "Admins can update notification status" ON job_approval_notifications;
CREATE POLICY "Admins can update notification status"
  ON job_approval_notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE user_id = auth.uid() AND can_approve_jobs = true
    )
  );

DROP POLICY IF EXISTS "Super admins can manage admin roles" ON admin_roles;
CREATE POLICY "Super admins can manage admin roles"
  ON admin_roles
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Users can view their own admin role" ON admin_roles;
CREATE POLICY "Users can view their own admin role"
  ON admin_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Function to notify admins of new job posting
CREATE OR REPLACE FUNCTION notify_admins_new_job()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  notification_id UUID;
BEGIN
  -- Only notify if job is pending approval
  IF NEW.approval_status = 'pending' THEN
    -- Create notifications for all admins who can approve jobs
    FOR admin_record IN 
      SELECT user_id, notification_email 
      FROM admin_roles 
      WHERE can_approve_jobs = true AND receive_job_notifications = true
    LOOP
      -- Insert notification
      INSERT INTO job_approval_notifications (job_id, admin_user_id, notification_type)
      VALUES (NEW.id, admin_record.user_id, 'new_job')
      ON CONFLICT (job_id, admin_user_id, notification_type) DO NOTHING
      RETURNING id INTO notification_id;
      
      -- Send push notification if notification was created
      IF notification_id IS NOT NULL THEN
        -- Log push notification
        PERFORM log_notification(
          admin_record.user_id,
          'new_job_pending',
          'New Job Awaiting Approval',
          'A new job posting "' || NEW.title || '" requires your review',
          jsonb_build_object('job_id', NEW.id, 'job_title', NEW.title),
          'sent'
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send email notification to job creator
CREATE OR REPLACE FUNCTION notify_job_creator(
  p_job_id UUID,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_job RECORD;
  v_creator_email TEXT;
  v_notification_type TEXT;
  v_title TEXT;
  v_body TEXT;
BEGIN
  -- Get job details
  SELECT * INTO v_job
  FROM products_services
  WHERE id = p_job_id;
  
  IF v_job IS NULL THEN
    RETURN false;
  END IF;
  
  -- Extract creator email from description or creator_email column
  IF v_job.creator_email IS NOT NULL THEN
    v_creator_email := v_job.creator_email;
  ELSE
    -- Try to extract from description (Email: xxx format)
    v_creator_email := substring(v_job.description FROM 'Email: ([^|]+)');
  END IF;
  
  -- Set notification content based on status
  IF p_status = 'approved' THEN
    v_notification_type := 'job_approved';
    v_title := '✅ Job Posting Approved';
    v_body := 'Your job posting "' || v_job.title || '" has been approved and is now live!';
  ELSIF p_status = 'declined' THEN
    v_notification_type := 'job_declined';
    v_title := '❌ Job Posting Declined';
    v_body := 'Your job posting "' || v_job.title || '" was not approved.';
    IF p_notes IS NOT NULL THEN
      v_body := v_body || ' Reason: ' || p_notes;
    END IF;
  ELSE
    RETURN false;
  END IF;
  
  -- Send push notification to job creator
  PERFORM log_notification(
    v_job.user_id,
    v_notification_type,
    v_title,
    v_body,
    jsonb_build_object(
      'job_id', p_job_id,
      'job_title', v_job.title,
      'status', p_status,
      'notes', p_notes,
      'email', v_creator_email
    ),
    'sent'
  );
  
  -- Mark notification for email sending
  INSERT INTO job_approval_notifications (job_id, admin_user_id, notification_type, email_sent)
  VALUES (p_job_id, v_job.user_id, p_status, false);
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve job
CREATE OR REPLACE FUNCTION approve_job(
  p_job_id UUID,
  p_admin_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT can_approve_jobs INTO v_is_admin
  FROM admin_roles
  WHERE user_id = p_admin_id;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'User does not have permission to approve jobs';
  END IF;
  
  -- Update job status
  UPDATE products_services
  SET 
    approval_status = 'approved',
    is_approved = true,
    approved_by = p_admin_id,
    approved_at = NOW(),
    approval_notes = p_notes
  WHERE id = p_job_id;
  
  -- Notify job creator
  PERFORM notify_job_creator(p_job_id, 'approved', p_notes);
  
  -- Mark admin notifications as read
  UPDATE job_approval_notifications
  SET read_at = NOW()
  WHERE job_id = p_job_id AND notification_type = 'new_job';
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decline job
CREATE OR REPLACE FUNCTION decline_job(
  p_job_id UUID,
  p_admin_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT can_approve_jobs INTO v_is_admin
  FROM admin_roles
  WHERE user_id = p_admin_id;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'User does not have permission to decline jobs';
  END IF;
  
  -- Update job status
  UPDATE products_services
  SET 
    approval_status = 'declined',
    is_approved = false,
    approved_by = p_admin_id,
    approved_at = NOW(),
    approval_notes = p_notes
  WHERE id = p_job_id;
  
  -- Notify job creator
  PERFORM notify_job_creator(p_job_id, 'declined', p_notes);
  
  -- Mark admin notifications as read
  UPDATE job_approval_notifications
  SET read_at = NOW()
  WHERE job_id = p_job_id AND notification_type = 'new_job';
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending jobs for admin
CREATE OR REPLACE FUNCTION get_pending_jobs(p_admin_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
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
    ps.id,
    ps.title,
    ps.description,
    ps.price,
    ps.image_url,
    ps.category_name,
    ps.created_at,
    ps.user_id,
    ps.creator_email
  FROM products_services ps
  WHERE ps.approval_status = 'pending'
  ORDER BY ps.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get admin notification count
CREATE OR REPLACE FUNCTION get_admin_notification_count(p_admin_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM job_approval_notifications
  WHERE admin_user_id = p_admin_id
    AND notification_type = 'new_job'
    AND read_at IS NULL;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to notify admins when new job is created
DROP TRIGGER IF EXISTS trigger_notify_admins_new_job ON products_services;
CREATE TRIGGER trigger_notify_admins_new_job
  AFTER INSERT ON products_services
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_job();

-- Grant permissions
GRANT SELECT ON job_approval_notifications TO authenticated;
GRANT UPDATE ON job_approval_notifications TO authenticated;
GRANT SELECT ON admin_roles TO authenticated;
GRANT EXECUTE ON FUNCTION notify_admins_new_job TO authenticated;
GRANT EXECUTE ON FUNCTION notify_job_creator TO authenticated;
GRANT EXECUTE ON FUNCTION approve_job TO authenticated;
GRANT EXECUTE ON FUNCTION decline_job TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_notification_count TO authenticated;

-- Add comments
COMMENT ON TABLE job_approval_notifications IS 'Notifications for job approval workflow';
COMMENT ON TABLE admin_roles IS 'Admin users who can approve job postings';
COMMENT ON FUNCTION approve_job IS 'Approve a pending job posting';
COMMENT ON FUNCTION decline_job IS 'Decline a pending job posting';
COMMENT ON FUNCTION get_pending_jobs IS 'Get all jobs pending approval';
COMMENT ON FUNCTION notify_job_creator IS 'Send notification to job creator about approval status';
