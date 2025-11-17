-- Add Application Status Tracking
-- Run this SQL in Supabase after FIX_MENTORSHIP_CRITICAL_ISSUES.sql

-- =====================================================
-- ADD REVIEWED_BY AND REVIEWED_AT TO APPLICATIONS
-- =====================================================

ALTER TABLE public.mentor_applications 
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);

ALTER TABLE public.mentor_applications 
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_applications_reviewed_by ON public.mentor_applications(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_applications_status_reviewed ON public.mentor_applications(status, reviewed_at);

-- =====================================================
-- UPDATE APPROVED_BY AND APPROVED_AT FOR MENTORS
-- =====================================================

ALTER TABLE public.alumni_mentors 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

ALTER TABLE public.alumni_mentors 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_mentors_approved_by ON public.alumni_mentors(approved_by);
