-- =============================================================================
-- JOB APPLICATION SYSTEM UPDATES
-- Additional tables and updates for full job application workflow
-- =============================================================================

-- =============================================================================
-- 1. JOB APPLICATION NOTIFICATIONS TABLE
-- For sending notifications when application status changes
-- =============================================================================
CREATE TABLE IF NOT EXISTS job_application_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES job_applications(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'new_application',        -- Sent to job poster when someone applies
    'application_reviewed',   -- Sent to applicant when application is reviewed
    'application_shortlisted', -- Sent to applicant when shortlisted
    'application_accepted',   -- Sent to applicant when accepted
    'application_rejected',   -- Sent to applicant when rejected
    'job_approved',           -- Sent to job poster when job is approved by admin
    'job_rejected'            -- Sent to job poster when job is rejected by admin
  )),
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  
  -- Contact details revealed on acceptance
  reveal_contact BOOLEAN DEFAULT FALSE,
  contact_email TEXT,
  contact_phone TEXT,
  contact_name TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE job_application_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON job_application_notifications FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can create notifications"
  ON job_application_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON job_application_notifications FOR UPDATE
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can delete their own notifications"
  ON job_application_notifications FOR DELETE
  USING (auth.uid() = recipient_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_app_notifications_recipient 
  ON job_application_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_job_app_notifications_unread 
  ON job_application_notifications(recipient_id, is_read) 
  WHERE is_read = false;

-- =============================================================================
-- 2. ADD ADMIN APPROVAL FIELDS TO JOBS TABLE
-- Jobs need admin approval before being visible
-- =============================================================================

-- Add rejection reason column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE jobs ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;

-- Add admin_reviewed_at column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'admin_reviewed_at'
  ) THEN
    ALTER TABLE jobs ADD COLUMN admin_reviewed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add admin_reviewed_by column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'admin_reviewed_by'
  ) THEN
    ALTER TABLE jobs ADD COLUMN admin_reviewed_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Update default value for is_approved to false (requires admin approval)
ALTER TABLE jobs ALTER COLUMN is_approved SET DEFAULT false;

-- =============================================================================
-- 3. ADD APPLICATION COUNT COLUMN TO JOBS
-- For quick reference of total applications
-- =============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'jobs' AND column_name = 'application_count'
  ) THEN
    ALTER TABLE jobs ADD COLUMN application_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- =============================================================================
-- 4. FUNCTION TO UPDATE APPLICATION COUNT
-- =============================================================================
CREATE OR REPLACE FUNCTION update_job_application_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE jobs SET application_count = COALESCE(application_count, 0) + 1 
    WHERE id = NEW.job_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE jobs SET application_count = GREATEST(COALESCE(application_count, 0) - 1, 0) 
    WHERE id = OLD.job_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS job_application_count_trigger ON job_applications;
CREATE TRIGGER job_application_count_trigger
  AFTER INSERT OR DELETE ON job_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_job_application_count();

-- =============================================================================
-- 5. ADMIN POLICIES FOR JOB APPROVAL
-- =============================================================================

-- Drop existing admin policy if exists and recreate
DROP POLICY IF EXISTS "Admins can update any job" ON jobs;

CREATE POLICY "Admins can update any job"
  ON jobs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role = 'admin')
    )
  );

-- Allow admins to view all jobs (including unapproved)
DROP POLICY IF EXISTS "Admins can view all jobs" ON jobs;

CREATE POLICY "Admins can view all jobs"
  ON jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role = 'admin')
    )
  );

-- Allow job owners to view their own unapproved jobs
DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;

CREATE POLICY "Users can view their own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================================================
-- 6. GRANT PERMISSIONS
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON job_application_notifications TO authenticated;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
SELECT 'job_application_notifications' as table_name, 
       count(*) as column_count 
FROM information_schema.columns 
WHERE table_name = 'job_application_notifications';
