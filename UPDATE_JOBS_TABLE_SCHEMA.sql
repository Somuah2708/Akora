-- =============================================
-- UPDATE JOBS TABLE SCHEMA
-- =============================================
-- Adds missing columns and updates RLS policies for the jobs table
-- This ensures the jobs table has all necessary fields for job listings

-- Add salary_min column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'salary_min'
    ) THEN
        ALTER TABLE public.jobs ADD COLUMN salary_min NUMERIC;
        RAISE NOTICE 'Added salary_min column';
    END IF;
END $$;

-- Add salary_max column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'salary_max'
    ) THEN
        ALTER TABLE public.jobs ADD COLUMN salary_max NUMERIC;
        RAISE NOTICE 'Added salary_max column';
    END IF;
END $$;

-- Add salary_currency column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'salary_currency'
    ) THEN
        ALTER TABLE public.jobs ADD COLUMN salary_currency TEXT DEFAULT 'GHS';
        RAISE NOTICE 'Added salary_currency column';
    END IF;
END $$;

-- Add salary_period column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'salary_period'
    ) THEN
        ALTER TABLE public.jobs ADD COLUMN salary_period TEXT DEFAULT 'monthly';
        RAISE NOTICE 'Added salary_period column';
    END IF;
END $$;

-- Add contact_email column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'contact_email'
    ) THEN
        ALTER TABLE public.jobs ADD COLUMN contact_email TEXT;
        RAISE NOTICE 'Added contact_email column';
    END IF;
END $$;

-- Add application_deadline column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'application_deadline'
    ) THEN
        ALTER TABLE public.jobs ADD COLUMN application_deadline TIMESTAMPTZ;
        RAISE NOTICE 'Added application_deadline column';
    END IF;
END $$;

-- Add rejection_reason column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE public.jobs ADD COLUMN rejection_reason TEXT;
        RAISE NOTICE 'Added rejection_reason column';
    END IF;
END $$;

-- Add admin_reviewed_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'admin_reviewed_at'
    ) THEN
        ALTER TABLE public.jobs ADD COLUMN admin_reviewed_at TIMESTAMPTZ;
        RAISE NOTICE 'Added admin_reviewed_at column';
    END IF;
END $$;

-- Add admin_reviewed_by column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'admin_reviewed_by'
    ) THEN
        ALTER TABLE public.jobs ADD COLUMN admin_reviewed_by UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added admin_reviewed_by column';
    END IF;
END $$;

-- Make application_link optional (it was NOT NULL before)
ALTER TABLE public.jobs ALTER COLUMN application_link DROP NOT NULL;

-- Set is_approved default to false for new submissions (require approval)
ALTER TABLE public.jobs ALTER COLUMN is_approved SET DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_is_approved ON public.jobs(is_approved);
CREATE INDEX IF NOT EXISTS idx_jobs_is_featured ON public.jobs(is_featured);

-- Update RLS policies for better security
-- Drop old policies first
DROP POLICY IF EXISTS "Enable read access for all users" ON public.jobs;
DROP POLICY IF EXISTS "Users can view approved jobs or their own" ON public.jobs;

-- Users can view approved jobs OR their own jobs (including pending/rejected)
CREATE POLICY "Users can view approved jobs or their own"
  ON public.jobs FOR SELECT
  USING (
    is_approved = true 
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Update job_applications table to reference jobs table instead of products_services
-- First check if job_applications.job_id still references products_services
-- Note: This requires manual intervention if there are existing references

-- Add comments for documentation
COMMENT ON TABLE public.jobs IS 'Job and internship listings posted by users';
COMMENT ON COLUMN public.jobs.job_type IS 'Type of job: Full Time Jobs, Internships, National Service, Part Time, Remote Work, Volunteering';
COMMENT ON COLUMN public.jobs.salary IS 'Formatted salary string (e.g., GHS 2000 - 3000/month)';
COMMENT ON COLUMN public.jobs.salary_min IS 'Minimum salary amount';
COMMENT ON COLUMN public.jobs.salary_max IS 'Maximum salary amount';
COMMENT ON COLUMN public.jobs.salary_currency IS 'Currency code (GHS, USD, etc.)';
COMMENT ON COLUMN public.jobs.salary_period IS 'Pay period (hourly, daily, weekly, monthly, yearly)';
COMMENT ON COLUMN public.jobs.is_approved IS 'Whether the job listing has been approved by admin';
COMMENT ON COLUMN public.jobs.rejection_reason IS 'Reason provided by admin for rejecting the job listing';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Jobs table schema updated successfully!';
    RAISE NOTICE 'All columns are now present and RLS policies updated.';
END $$;
