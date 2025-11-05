-- =====================================================
-- EDUCATION APPLICATIONS TABLE
-- For tracking user applications to universities/scholarships
-- =====================================================

-- Create applications table
CREATE TABLE IF NOT EXISTS education_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  opportunity_id UUID REFERENCES products_services(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'accepted', 'rejected', 'withdrawn')),
  application_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  documents_submitted BOOLEAN DEFAULT false,
  follow_up_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_education_applications_user_id ON education_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_education_applications_opportunity_id ON education_applications(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_education_applications_status ON education_applications(status);

-- Enable RLS
ALTER TABLE education_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own applications"
  ON education_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own applications"
  ON education_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications"
  ON education_applications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own applications"
  ON education_applications FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE education_applications IS 'Tracks user applications to universities and scholarships with status';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_education_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER education_applications_updated_at
  BEFORE UPDATE ON education_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_education_applications_updated_at();
