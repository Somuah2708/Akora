-- ================================================
-- Add occupation and education fields to profiles
-- ================================================
-- This migration adds fields to track user's occupation status,
-- job details, and education program information
-- ================================================

-- Add new columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS occupation_status TEXT CHECK (occupation_status IN ('student', 'employed', 'self_employed', 'unemployed', 'other')),
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS education_level TEXT CHECK (education_level IN ('high_school', 'undergraduate', 'postgraduate', 'doctorate', 'other')),
ADD COLUMN IF NOT EXISTS institution_name TEXT,
ADD COLUMN IF NOT EXISTS program_of_study TEXT,
ADD COLUMN IF NOT EXISTS graduation_year INTEGER,
ADD COLUMN IF NOT EXISTS is_occupation_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_education_public BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN profiles.occupation_status IS 'Current occupation status: student, employed, self_employed, unemployed, or other';
COMMENT ON COLUMN profiles.job_title IS 'Current job title if employed';
COMMENT ON COLUMN profiles.company_name IS 'Company or organization name if employed';
COMMENT ON COLUMN profiles.education_level IS 'Current or highest education level';
COMMENT ON COLUMN profiles.institution_name IS 'School, college, or university name';
COMMENT ON COLUMN profiles.program_of_study IS 'Field of study or program name (e.g., Computer Science, Business Administration)';
COMMENT ON COLUMN profiles.graduation_year IS 'Expected or actual graduation year';
COMMENT ON COLUMN profiles.is_occupation_public IS 'Whether occupation details are visible to other users';
COMMENT ON COLUMN profiles.is_education_public IS 'Whether education details are visible to other users';

-- Create index for faster queries on occupation status
CREATE INDEX IF NOT EXISTS idx_profiles_occupation_status ON profiles(occupation_status);
CREATE INDEX IF NOT EXISTS idx_profiles_education_level ON profiles(education_level);

-- Verification query
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN (
  'occupation_status',
  'job_title',
  'company_name',
  'education_level',
  'institution_name',
  'program_of_study',
  'graduation_year',
  'is_occupation_public',
  'is_education_public'
)
ORDER BY ordinal_position;
