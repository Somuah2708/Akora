-- =============================================
-- ADD JOB REJECTION FIELDS
-- =============================================
-- Adds rejection tracking fields to the jobs table
-- to support showing pending/rejected status to users

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
        RAISE NOTICE 'Added rejection_reason column to jobs table';
    ELSE
        RAISE NOTICE 'rejection_reason column already exists';
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
        RAISE NOTICE 'Added admin_reviewed_at column to jobs table';
    ELSE
        RAISE NOTICE 'admin_reviewed_at column already exists';
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
        RAISE NOTICE 'Added admin_reviewed_by column to jobs table';
    ELSE
        RAISE NOTICE 'admin_reviewed_by column already exists';
    END IF;
END $$;

-- Ensure is_approved defaults to false for new submissions
ALTER TABLE public.jobs ALTER COLUMN is_approved SET DEFAULT false;

-- Create index for faster filtering of pending jobs
CREATE INDEX IF NOT EXISTS idx_jobs_is_approved ON public.jobs(is_approved);
CREATE INDEX IF NOT EXISTS idx_jobs_user_pending ON public.jobs(user_id, is_approved) WHERE is_approved = false;

-- Update RLS policy to allow users to see their own jobs regardless of approval status
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.jobs;
CREATE POLICY "Users can view their own jobs"
  ON public.jobs FOR SELECT
  USING (auth.uid() = user_id OR is_approved = true);

-- Comment on columns for documentation
COMMENT ON COLUMN public.jobs.rejection_reason IS 'Reason provided by admin for rejecting the job listing';
COMMENT ON COLUMN public.jobs.admin_reviewed_at IS 'Timestamp when an admin reviewed (approved/rejected) the job';
COMMENT ON COLUMN public.jobs.admin_reviewed_by IS 'User ID of the admin who reviewed the job';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Job rejection fields migration completed successfully!';
END $$;
