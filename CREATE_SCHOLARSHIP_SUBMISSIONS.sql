-- Create scholarship_submissions table for user-submitted scholarships
-- Allows both alumni and admins to submit scholarships with admin approval workflow

CREATE TABLE IF NOT EXISTS public.scholarship_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Submitter Information
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  submitted_by_name text NOT NULL,
  submitted_by_email text NOT NULL,
  submitted_by_role text DEFAULT 'user', -- 'admin', 'alumni', 'user'
  
  -- Scholarship Details
  title text NOT NULL,
  description text NOT NULL,
  funding_amount text,
  funding_currency text DEFAULT 'USD',
  
  -- Deadlines
  deadline_date date,
  deadline_text text, -- Freeform deadline like "Rolling admissions"
  
  -- Eligibility & Requirements
  eligibility_criteria text,
  eligibility_level text, -- 'Undergraduate', 'Graduate', 'PhD', 'All Levels'
  target_countries text[], -- Countries where students can apply from
  study_destinations text[], -- Countries where scholarship is valid
  
  -- Application Information
  application_url text,
  contact_email text,
  website_url text,
  
  -- Media & Attachments
  image_url text,
  attachment_urls text[],
  
  -- Categories & Tags
  scholarship_type text, -- 'Merit-based', 'Need-based', 'Sports', 'Arts', 'STEM', etc.
  fields_of_study text[], -- Engineering, Medicine, Business, etc.
  
  -- Review & Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'draft')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  rejection_reason text,
  
  -- Metadata
  source_organization text, -- Name of organization offering the scholarship
  is_renewable boolean DEFAULT false,
  number_of_awards integer,
  
  -- Search & Discovery
  keywords text[],
  featured boolean DEFAULT false
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scholarship_submissions_user_id 
  ON public.scholarship_submissions(user_id);

CREATE INDEX IF NOT EXISTS idx_scholarship_submissions_status 
  ON public.scholarship_submissions(status);

CREATE INDEX IF NOT EXISTS idx_scholarship_submissions_reviewed_by 
  ON public.scholarship_submissions(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_scholarship_submissions_created_at 
  ON public.scholarship_submissions(created_at DESC);

-- Add comments
COMMENT ON TABLE public.scholarship_submissions IS 'User and alumni submitted scholarships pending admin approval';
COMMENT ON COLUMN public.scholarship_submissions.status IS 'pending: awaiting review, approved: visible to users, rejected: declined by admin, draft: saved but not submitted';
COMMENT ON COLUMN public.scholarship_submissions.submitted_by_role IS 'Role of the person who submitted: admin, alumni, or regular user';

-- Enable Row Level Security
ALTER TABLE public.scholarship_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- 1. Users can view their own submissions
CREATE POLICY "Users can view own submissions"
  ON public.scholarship_submissions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Users can insert their own submissions
CREATE POLICY "Users can create submissions"
  ON public.scholarship_submissions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own pending/draft submissions
CREATE POLICY "Users can update own pending submissions"
  ON public.scholarship_submissions
  FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('pending', 'draft'))
  WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'draft'));

-- 4. Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
  ON public.scholarship_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role IN ('admin', 'staff'))
    )
  );

-- 5. Admins can update any submission (approve/reject)
CREATE POLICY "Admins can update all submissions"
  ON public.scholarship_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role IN ('admin', 'staff'))
    )
  );

-- 6. Admins can delete submissions
CREATE POLICY "Admins can delete submissions"
  ON public.scholarship_submissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role IN ('admin', 'staff'))
    )
  );

-- Create a view for approved scholarships (public access)
CREATE OR REPLACE VIEW public.approved_scholarships AS
SELECT 
  id,
  created_at,
  title,
  description,
  funding_amount,
  funding_currency,
  deadline_date,
  deadline_text,
  eligibility_criteria,
  eligibility_level,
  target_countries,
  study_destinations,
  application_url,
  contact_email,
  website_url,
  image_url,
  scholarship_type,
  fields_of_study,
  source_organization,
  is_renewable,
  number_of_awards,
  keywords,
  featured,
  submitted_by_name
FROM public.scholarship_submissions
WHERE status = 'approved'
ORDER BY featured DESC, created_at DESC;

-- Grant access to the view
GRANT SELECT ON public.approved_scholarships TO anon, authenticated;

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scholarship_submission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS scholarship_submissions_updated_at ON public.scholarship_submissions;
CREATE TRIGGER scholarship_submissions_updated_at
  BEFORE UPDATE ON public.scholarship_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_scholarship_submission_updated_at();

-- Verify the table was created
SELECT 
  table_name,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = 'scholarship_submissions') as column_count
FROM information_schema.tables
WHERE table_name = 'scholarship_submissions';
