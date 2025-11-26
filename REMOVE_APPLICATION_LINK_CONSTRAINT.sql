-- Remove NOT NULL constraint from application_link column
-- Since we're now using in-app applications instead of external links,
-- this column is no longer required

-- Make application_link nullable
ALTER TABLE public.jobs 
ALTER COLUMN application_link DROP NOT NULL;

-- Add comment explaining the column is deprecated
COMMENT ON COLUMN public.jobs.application_link IS 'DEPRECATED: External application link - kept for backward compatibility but no longer required. Use in-app job applications instead.';

-- Alternative: If you want to completely remove the column (uncomment the line below)
-- ALTER TABLE public.jobs DROP COLUMN IF EXISTS application_link;
