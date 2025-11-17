-- Fix Critical Mentorship System Issues
-- Run this SQL in Supabase to fix RLS policies and add missing functionality

-- =====================================================
-- 1. ADD USER_ID COLUMN TO ALUMNI_MENTORS
-- =====================================================

-- Add user_id foreign key to alumni_mentors table
ALTER TABLE public.alumni_mentors 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_alumni_mentors_user_id ON public.alumni_mentors(user_id);

-- Update existing mentors to link user_id based on email match
UPDATE public.alumni_mentors am
SET user_id = au.id
FROM auth.users au
WHERE LOWER(am.email) = LOWER(au.email)
AND am.user_id IS NULL;

-- =====================================================
-- 2. FIX RLS POLICIES - MENTORS CAN VIEW THEIR REQUESTS
-- =====================================================

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Mentors can view requests sent to them" ON public.mentor_requests;

-- Create new policy allowing mentors to view requests where they are the mentor
CREATE POLICY "Mentors can view requests sent to them"
  ON public.mentor_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.alumni_mentors
      WHERE alumni_mentors.id = mentor_requests.mentor_id
      AND (
        alumni_mentors.user_id = auth.uid()
        OR LOWER(alumni_mentors.email) = LOWER(auth.email())
      )
    )
  );

-- =====================================================
-- 3. FIX RLS POLICIES - MENTORS CAN UPDATE REQUESTS
-- =====================================================

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Mentors can update their requests" ON public.mentor_requests;

-- Create new policy allowing mentors to update requests (accept/decline)
CREATE POLICY "Mentors can update their requests"
  ON public.mentor_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.alumni_mentors
      WHERE alumni_mentors.id = mentor_requests.mentor_id
      AND (
        alumni_mentors.user_id = auth.uid()
        OR LOWER(alumni_mentors.email) = LOWER(auth.email())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.alumni_mentors
      WHERE alumni_mentors.id = mentor_requests.mentor_id
      AND (
        alumni_mentors.user_id = auth.uid()
        OR LOWER(alumni_mentors.email) = LOWER(auth.email())
      )
    )
  );

-- =====================================================
-- 4. ADD INDEXES FOR EMAIL MATCHING (LOWERCASE)
-- =====================================================

-- Create functional index for case-insensitive email matching
CREATE INDEX IF NOT EXISTS idx_alumni_mentors_email_lower 
ON public.alumni_mentors(LOWER(email));

CREATE INDEX IF NOT EXISTS idx_mentor_requests_mentor_status 
ON public.mentor_requests(mentor_id, status);

-- =====================================================
-- 5. ADD MENTOR_FAVORITES TABLE FOR BOOKMARKING
-- =====================================================

CREATE TABLE IF NOT EXISTS public.mentor_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.alumni_mentors(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, mentor_id)
);

-- Enable RLS
ALTER TABLE public.mentor_favorites ENABLE ROW LEVEL SECURITY;

-- Users can manage their own favorites
CREATE POLICY "Users can view own favorites"
  ON public.mentor_favorites FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can add favorites"
  ON public.mentor_favorites FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove favorites"
  ON public.mentor_favorites FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_mentor_favorites_user_id ON public.mentor_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_favorites_mentor_id ON public.mentor_favorites(mentor_id);

-- =====================================================
-- 6. ADD DUPLICATE REQUEST PREVENTION CONSTRAINT
-- =====================================================

-- Add unique constraint to prevent duplicate pending requests
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_request 
ON public.mentor_requests(mentor_id, mentee_id, status)
WHERE status = 'pending';

-- =====================================================
-- 7. ADD COMPOSITE INDEXES FOR PERFORMANCE
-- =====================================================

-- Composite index for mentor listing
CREATE INDEX IF NOT EXISTS idx_mentors_status_industry 
ON public.alumni_mentors(status, industry) WHERE status = 'approved';

-- GIN index for array search on expertise_areas
CREATE INDEX IF NOT EXISTS idx_mentors_expertise_gin 
ON public.alumni_mentors USING GIN(expertise_areas);

-- Index for sorting
CREATE INDEX IF NOT EXISTS idx_mentors_created_at 
ON public.alumni_mentors(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_applications_created_at 
ON public.mentor_applications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requests_created_at 
ON public.mentor_requests(created_at DESC);

-- =====================================================
-- 8. VERIFY SETUP
-- =====================================================

DO $$
DECLARE
  mentors_count INTEGER;
  applications_count INTEGER;
  requests_count INTEGER;
  policies_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mentors_count FROM public.alumni_mentors;
  SELECT COUNT(*) INTO applications_count FROM public.mentor_applications;
  SELECT COUNT(*) INTO requests_count FROM public.mentor_requests;
  SELECT COUNT(*) INTO policies_count FROM pg_policies 
  WHERE tablename IN ('alumni_mentors', 'mentor_applications', 'mentor_requests', 'mentor_favorites');
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CRITICAL FIXES APPLIED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Mentors: %', mentors_count;
  RAISE NOTICE '📝 Applications: %', applications_count;
  RAISE NOTICE '💬 Requests: %', requests_count;
  RAISE NOTICE '🔐 RLS Policies: %', policies_count;
  RAISE NOTICE '========================================';
END $$;
