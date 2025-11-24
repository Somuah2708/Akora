-- =====================================================
-- JOB APPLICATIONS TABLE
-- For tracking user applications to job postings
-- =====================================================

-- Create job_applications table
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES products_services(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Application details
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    cover_letter TEXT NOT NULL,
    qualifications TEXT,
    cv_url TEXT, -- URL to uploaded CV document
    portfolio_url TEXT,
    linkedin_url TEXT,
    website_url TEXT,
    
    -- Additional info
    availability_date DATE,
    salary_expectation TEXT,
    years_of_experience INTEGER,
    notice_period TEXT,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'accepted', 'rejected')),
    employer_notes TEXT, -- Private notes from employer
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    
    -- Prevent duplicate applications
    UNIQUE(job_id, applicant_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant_id ON job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_employer_id ON job_applications(employer_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON job_applications(created_at DESC);

-- Enable RLS
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Applicants can view their own applications
CREATE POLICY "Applicants can view their own applications"
  ON job_applications FOR SELECT
  USING (auth.uid() = applicant_id);

-- Employers can view applications to their jobs
CREATE POLICY "Employers can view applications to their jobs"
  ON job_applications FOR SELECT
  USING (auth.uid() = employer_id);

-- Applicants can create applications
CREATE POLICY "Applicants can create applications"
  ON job_applications FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

-- Employers can update application status
CREATE POLICY "Employers can update applications to their jobs"
  ON job_applications FOR UPDATE
  USING (auth.uid() = employer_id);

-- Applicants can update their own pending applications
CREATE POLICY "Applicants can update their pending applications"
  ON job_applications FOR UPDATE
  USING (auth.uid() = applicant_id AND status = 'pending');

-- Applicants can delete their own pending applications
CREATE POLICY "Applicants can delete pending applications"
  ON job_applications FOR DELETE
  USING (auth.uid() = applicant_id AND status = 'pending');

-- =====================================================
-- UPDATE TRIGGER FOR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_job_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_applications_updated_at
    BEFORE UPDATE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_job_applications_updated_at();

-- =====================================================
-- TRIGGER TO SET reviewed_at TIMESTAMP
-- =====================================================
CREATE OR REPLACE FUNCTION set_job_application_reviewed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status AND NEW.status != 'pending' THEN
        NEW.reviewed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_application_reviewed_at_trigger
    BEFORE UPDATE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION set_job_application_reviewed_at();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE job_applications IS 'Stores job applications from users to job postings';
COMMENT ON COLUMN job_applications.status IS 'Application status: pending, reviewed, shortlisted, accepted, rejected';
COMMENT ON COLUMN job_applications.employer_notes IS 'Private notes from employer about the application';
COMMENT ON COLUMN job_applications.cv_url IS 'URL to uploaded CV/resume document';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON job_applications TO authenticated;
GRANT USAGE ON SEQUENCE job_applications_id_seq TO authenticated;
