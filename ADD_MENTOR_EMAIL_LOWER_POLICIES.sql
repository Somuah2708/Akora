-- Normalize email comparisons for mentor dashboard policies using lower(...)
-- Safe to run multiple times

-- Ensure helpful index exists (no-op if already created elsewhere)
CREATE INDEX IF NOT EXISTS idx_alumni_mentors_email_lower ON public.alumni_mentors((lower(email)));
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON public.profiles((lower(email)));

-- Replace mentor dashboard policies with lowercase-safe variants
DROP POLICY IF EXISTS "Mentors can view their requests" ON public.mentor_requests;
CREATE POLICY "Mentors can view their requests"
  ON public.mentor_requests
  FOR SELECT
  USING (
    mentor_id IN (
      SELECT id FROM public.alumni_mentors m
      WHERE lower(m.email) IN (
        SELECT lower(p.email) FROM public.profiles p WHERE p.id = auth.uid()
      )
      AND m.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Mentors can update their requests" ON public.mentor_requests;
CREATE POLICY "Mentors can update their requests"
  ON public.mentor_requests
  FOR UPDATE
  USING (
    mentor_id IN (
      SELECT id FROM public.alumni_mentors m
      WHERE lower(m.email) IN (
        SELECT lower(p.email) FROM public.profiles p WHERE p.id = auth.uid()
      )
      AND m.status = 'approved'
    )
  );

-- Verify
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'mentor_requests'
ORDER BY policyname;