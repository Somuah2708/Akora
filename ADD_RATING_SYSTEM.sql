-- =============================================
-- MENTORSHIP RATING SYSTEM
-- =============================================
-- This migration adds a rating and review system for mentors
-- Allows mentees to rate mentors after completed sessions

-- Create mentor_ratings table
CREATE TABLE IF NOT EXISTS mentor_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL REFERENCES alumni_mentors(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES mentor_requests(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(request_id) -- One rating per request
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_mentor_ratings_mentor_id ON mentor_ratings(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_ratings_mentee_id ON mentor_ratings(mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentor_ratings_created_at ON mentor_ratings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_ratings_rating ON mentor_ratings(rating);

-- Add average rating and total ratings to alumni_mentors
ALTER TABLE alumni_mentors 
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;

-- Create function to update mentor rating stats
CREATE OR REPLACE FUNCTION update_mentor_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update average rating and total ratings for the mentor
  UPDATE alumni_mentors
  SET 
    average_rating = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
      FROM mentor_ratings
      WHERE mentor_id = COALESCE(NEW.mentor_id, OLD.mentor_id)
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM mentor_ratings
      WHERE mentor_id = COALESCE(NEW.mentor_id, OLD.mentor_id)
    )
  WHERE id = COALESCE(NEW.mentor_id, OLD.mentor_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update mentor stats
DROP TRIGGER IF EXISTS trigger_update_mentor_rating_stats ON mentor_ratings;
CREATE TRIGGER trigger_update_mentor_rating_stats
AFTER INSERT OR UPDATE OR DELETE ON mentor_ratings
FOR EACH ROW
EXECUTE FUNCTION update_mentor_rating_stats();

-- RLS Policies for mentor_ratings
ALTER TABLE mentor_ratings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all ratings
CREATE POLICY "Anyone can view ratings"
ON mentor_ratings FOR SELECT
TO authenticated
USING (true);

-- Policy: Mentees can insert ratings for their own completed requests
CREATE POLICY "Mentees can insert ratings for completed requests"
ON mentor_ratings FOR INSERT
TO authenticated
WITH CHECK (
  mentee_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM mentor_requests
    WHERE id = request_id
    AND mentee_id = auth.uid()
    AND status = 'completed'
  )
);

-- Policy: Mentees can update their own ratings within 7 days
CREATE POLICY "Mentees can update own ratings within 7 days"
ON mentor_ratings FOR UPDATE
TO authenticated
USING (
  mentee_id = auth.uid()
  AND created_at > NOW() - INTERVAL '7 days'
)
WITH CHECK (
  mentee_id = auth.uid()
);

-- Policy: Mentees can delete their own ratings within 24 hours
CREATE POLICY "Mentees can delete own ratings within 24 hours"
ON mentor_ratings FOR DELETE
TO authenticated
USING (
  mentee_id = auth.uid()
  AND created_at > NOW() - INTERVAL '24 hours'
);

-- Create view for mentor rating summary
CREATE OR REPLACE VIEW mentor_rating_summary AS
SELECT 
  m.id as mentor_id,
  m.full_name,
  m.average_rating,
  m.total_ratings,
  COUNT(CASE WHEN r.rating = 5 THEN 1 END) as five_star_count,
  COUNT(CASE WHEN r.rating = 4 THEN 1 END) as four_star_count,
  COUNT(CASE WHEN r.rating = 3 THEN 1 END) as three_star_count,
  COUNT(CASE WHEN r.rating = 2 THEN 1 END) as two_star_count,
  COUNT(CASE WHEN r.rating = 1 THEN 1 END) as one_star_count,
  COUNT(CASE WHEN r.review IS NOT NULL AND r.review != '' THEN 1 END) as review_count
FROM alumni_mentors m
LEFT JOIN mentor_ratings r ON m.id = r.mentor_id
GROUP BY m.id, m.full_name, m.average_rating, m.total_ratings;

-- Grant access to the view
GRANT SELECT ON mentor_rating_summary TO authenticated;

COMMENT ON TABLE mentor_ratings IS 'Stores ratings and reviews for mentors from mentees';
COMMENT ON COLUMN mentor_ratings.rating IS 'Rating from 1-5 stars';
COMMENT ON COLUMN mentor_ratings.review IS 'Optional text review';
COMMENT ON COLUMN mentor_ratings.helpful_count IS 'Number of users who found this review helpful';
COMMENT ON COLUMN alumni_mentors.average_rating IS 'Auto-calculated average rating (0-5)';
COMMENT ON COLUMN alumni_mentors.total_ratings IS 'Auto-calculated total number of ratings';
