-- ================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- ================================================
-- This adds occupation and education fields to user profiles
-- ================================================

-- Step 1: Add new columns
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

-- Step 2: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_occupation_status ON profiles(occupation_status);
CREATE INDEX IF NOT EXISTS idx_profiles_education_level ON profiles(education_level);

-- Step 3: Verify the migration
SELECT 
  column_name, 
  data_type,
  is_nullable
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

-- ================================================
-- Expected output: 9 rows showing the new columns
-- ================================================
