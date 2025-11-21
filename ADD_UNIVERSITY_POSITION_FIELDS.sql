-- Migration: Add university and position_at_university fields to mentor tables
-- This replaces graduation_year and degree with current employment information

-- Add columns to alumni_mentors table
ALTER TABLE alumni_mentors
ADD COLUMN IF NOT EXISTS university TEXT,
ADD COLUMN IF NOT EXISTS position_at_university TEXT;

-- Add columns to mentor_applications table
ALTER TABLE mentor_applications
ADD COLUMN IF NOT EXISTS university TEXT,
ADD COLUMN IF NOT EXISTS position_at_university TEXT;

-- Optional: Drop old columns if you want to clean up (uncomment if needed)
-- ALTER TABLE alumni_mentors
-- DROP COLUMN IF EXISTS graduation_year,
-- DROP COLUMN IF EXISTS degree;

-- ALTER TABLE mentor_applications
-- DROP COLUMN IF EXISTS graduation_year,
-- DROP COLUMN IF EXISTS degree;

-- Add comments to document the new columns
COMMENT ON COLUMN alumni_mentors.university IS 'Current university or institution where the mentor works';
COMMENT ON COLUMN alumni_mentors.position_at_university IS 'Mentor''s current position/role at the university (e.g., Lecturer, Professor)';
COMMENT ON COLUMN mentor_applications.university IS 'Applicant''s current university or institution';
COMMENT ON COLUMN mentor_applications.position_at_university IS 'Applicant''s position/role at the university';

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('alumni_mentors', 'mentor_applications')
  AND column_name IN ('university', 'position_at_university', 'graduation_year', 'degree')
ORDER BY table_name, column_name;
