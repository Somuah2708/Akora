-- Add contact_email and application_deadline columns to jobs table
-- This allows job posters to:
-- 1. Provide a contact email that applicants can see
-- 2. Set a custom application deadline instead of auto-calculating 30 days

-- Add contact_email column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'contact_email'
    ) THEN
        ALTER TABLE public.jobs ADD COLUMN contact_email TEXT;
        COMMENT ON COLUMN public.jobs.contact_email IS 'Contact email for applicants to reach out';
    END IF;
END $$;

-- Add application_deadline column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'application_deadline'
    ) THEN
        ALTER TABLE public.jobs ADD COLUMN application_deadline DATE;
        COMMENT ON COLUMN public.jobs.application_deadline IS 'Custom application deadline set by job poster';
    END IF;
END $$;

-- Create index for deadline queries
CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON public.jobs(application_deadline);

COMMENT ON TABLE public.jobs IS 'Job listings with contact email and custom deadline support';
