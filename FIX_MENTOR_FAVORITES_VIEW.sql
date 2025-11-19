-- Fix user_favorite_mentors view to use correct join
-- First add mentor_id column to education_bookmarks if not exists
-- Then create view that works with both opportunity_id and mentor_id

-- Make opportunity_id nullable since mentors won't have an opportunity_id
ALTER TABLE education_bookmarks 
  ALTER COLUMN opportunity_id DROP NOT NULL;

-- Add mentor_id column to education_bookmarks table
ALTER TABLE education_bookmarks 
  ADD COLUMN IF NOT EXISTS mentor_id UUID REFERENCES alumni_mentors(id) ON DELETE CASCADE;

-- Add constraint to ensure either opportunity_id or mentor_id is set (but not both)
ALTER TABLE education_bookmarks
  DROP CONSTRAINT IF EXISTS check_bookmark_type;
  
ALTER TABLE education_bookmarks
  ADD CONSTRAINT check_bookmark_type 
  CHECK (
    (opportunity_id IS NOT NULL AND mentor_id IS NULL) OR 
    (opportunity_id IS NULL AND mentor_id IS NOT NULL)
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookmarks_mentor_id ON education_bookmarks(mentor_id);

-- Drop the old view
DROP VIEW IF EXISTS user_favorite_mentors;

-- Recreate with correct join using education_bookmarks
CREATE OR REPLACE VIEW user_favorite_mentors AS
SELECT 
  eb.user_id,
  eb.mentor_id,
  eb.created_at as favorited_at,
  am.full_name,
  am.current_title,
  am.company,
  am.expertise_areas,
  am.years_of_experience,
  am.meeting_formats,
  am.available_hours,
  am.profile_photo_url,
  am.short_bio as bio,
  am.status
FROM education_bookmarks eb
JOIN alumni_mentors am ON eb.mentor_id = am.id
WHERE am.status = 'approved' AND eb.mentor_id IS NOT NULL;

-- Grant permissions
GRANT SELECT ON user_favorite_mentors TO authenticated;

-- Add comment
COMMENT ON VIEW user_favorite_mentors IS 'Complete details of mentors bookmarked by users via education_bookmarks';
COMMENT ON COLUMN education_bookmarks.mentor_id IS 'Optional mentor ID for bookmarking alumni mentors';
