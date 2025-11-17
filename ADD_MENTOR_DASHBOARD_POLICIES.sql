-- Additional RLS Policies for Mentor Dashboard

-- Allow mentors to view requests sent to them (by matching email)
DROP POLICY IF EXISTS "Mentors can view their requests" ON public.mentor_requests;
CREATE POLICY "Mentors can view their requests"
  ON public.mentor_requests
  FOR SELECT
  USING (
    mentor_id IN (
      SELECT id FROM public.alumni_mentors
      WHERE email IN (
        SELECT email FROM public.profiles WHERE id = auth.uid()
      )
      AND status = 'approved'
    )
  );

-- Allow mentors to update their requests (accept/decline)
DROP POLICY IF EXISTS "Mentors can update their requests" ON public.mentor_requests;
CREATE POLICY "Mentors can update their requests"
  ON public.mentor_requests
  FOR UPDATE
  USING (
    mentor_id IN (
      SELECT id FROM public.alumni_mentors
      WHERE email IN (
        SELECT email FROM public.profiles WHERE id = auth.uid()
      )
      AND status = 'approved'
    )
  );

-- Verify the new policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'mentor_requests'
ORDER BY policyname;
