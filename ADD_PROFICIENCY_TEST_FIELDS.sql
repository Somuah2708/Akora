-- Add proficiency test specific fields to transcript_requests table
-- These fields are only used when request_kind = 'proficiency'

ALTER TABLE public.transcript_requests
ADD COLUMN IF NOT EXISTS test_subject TEXT,
ADD COLUMN IF NOT EXISTS test_level TEXT DEFAULT 'Basic',
ADD COLUMN IF NOT EXISTS preferred_test_date TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.transcript_requests.test_subject IS 'Subject/test name for proficiency tests (e.g., English Language, Mathematics)';
COMMENT ON COLUMN public.transcript_requests.test_level IS 'Test difficulty level: Basic, Intermediate, or Advanced';
COMMENT ON COLUMN public.transcript_requests.preferred_test_date IS 'User preferred date/timeframe for taking the proficiency test';
