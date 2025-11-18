-- Migration: Add Mentor Badges and Leaderboard System
-- Description: Badge achievements, leaderboard rankings, and testimonials
-- Created: 2025-11-17

-- Table: Mentor badges/achievements
CREATE TABLE IF NOT EXISTS mentor_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID REFERENCES alumni_mentors(id) ON DELETE CASCADE NOT NULL,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  icon_name TEXT,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(mentor_id, badge_type)
);

-- Create index for efficient badge queries
CREATE INDEX IF NOT EXISTS idx_mentor_badges_mentor_id ON mentor_badges(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_badges_earned_at ON mentor_badges(earned_at DESC);

-- Table: Mentor testimonials
CREATE TABLE IF NOT EXISTS mentor_testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID REFERENCES alumni_mentors(id) ON DELETE CASCADE NOT NULL,
  mentee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  request_id UUID REFERENCES mentor_requests(id) ON DELETE SET NULL,
  testimonial TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE,
  is_approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for testimonials
CREATE INDEX IF NOT EXISTS idx_mentor_testimonials_mentor_id ON mentor_testimonials(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_testimonials_mentee_id ON mentor_testimonials(mentee_id);
CREATE INDEX IF NOT EXISTS idx_mentor_testimonials_featured ON mentor_testimonials(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_mentor_testimonials_approved ON mentor_testimonials(is_approved) WHERE is_approved = TRUE;

-- Enable RLS on tables
ALTER TABLE mentor_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_testimonials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mentor_badges
CREATE POLICY "Anyone can view badges"
  ON mentor_badges FOR SELECT
  USING (true);

CREATE POLICY "System can insert badges"
  ON mentor_badges FOR INSERT
  WITH CHECK (true);

-- RLS Policies for mentor_testimonials
CREATE POLICY "Anyone can view approved testimonials"
  ON mentor_testimonials FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Mentees can create testimonials"
  ON mentor_testimonials FOR INSERT
  WITH CHECK (auth.uid() = mentee_id);

CREATE POLICY "Mentees can update their own testimonials"
  ON mentor_testimonials FOR UPDATE
  USING (auth.uid() = mentee_id)
  WITH CHECK (auth.uid() = mentee_id);

CREATE POLICY "Admins can approve testimonials"
  ON mentor_testimonials FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Function to automatically award badges
CREATE OR REPLACE FUNCTION award_mentor_badges()
RETURNS VOID AS $$
DECLARE
  mentor_record RECORD;
  badge_exists BOOLEAN;
BEGIN
  FOR mentor_record IN 
    SELECT 
      am.id,
      am.full_name,
      COUNT(mr.id) as total_sessions,
      COUNT(mr.id) FILTER (WHERE mr.status = 'completed') as completed_sessions,
      COALESCE(AVG(r.rating), 0) as avg_rating,
      COUNT(r.id) as rating_count,
      MAX(mr.created_at) as last_session
    FROM alumni_mentors am
    LEFT JOIN mentor_requests mr ON am.id = mr.mentor_id
    LEFT JOIN mentor_ratings r ON am.id = r.mentor_id
    WHERE am.status = 'approved'
    GROUP BY am.id, am.full_name
  LOOP
    -- First Session Badge
    IF mentor_record.completed_sessions >= 1 THEN
      SELECT EXISTS (
        SELECT 1 FROM mentor_badges 
        WHERE mentor_id = mentor_record.id AND badge_type = 'first_session'
      ) INTO badge_exists;
      
      IF NOT badge_exists THEN
        INSERT INTO mentor_badges (mentor_id, badge_type, badge_name, badge_description, icon_name)
        VALUES (
          mentor_record.id,
          'first_session',
          'First Steps',
          'Completed your first mentorship session',
          'award'
        );
      END IF;
    END IF;
    
    -- 10 Sessions Milestone
    IF mentor_record.completed_sessions >= 10 THEN
      SELECT EXISTS (
        SELECT 1 FROM mentor_badges 
        WHERE mentor_id = mentor_record.id AND badge_type = 'ten_sessions'
      ) INTO badge_exists;
      
      IF NOT badge_exists THEN
        INSERT INTO mentor_badges (mentor_id, badge_type, badge_name, badge_description, icon_name)
        VALUES (
          mentor_record.id,
          'ten_sessions',
          'Dedicated Mentor',
          'Completed 10 mentorship sessions',
          'star'
        );
      END IF;
    END IF;
    
    -- 25 Sessions Milestone
    IF mentor_record.completed_sessions >= 25 THEN
      SELECT EXISTS (
        SELECT 1 FROM mentor_badges 
        WHERE mentor_id = mentor_record.id AND badge_type = 'twenty_five_sessions'
      ) INTO badge_exists;
      
      IF NOT badge_exists THEN
        INSERT INTO mentor_badges (mentor_id, badge_type, badge_name, badge_description, icon_name)
        VALUES (
          mentor_record.id,
          'twenty_five_sessions',
          'Mentorship Champion',
          'Completed 25 mentorship sessions',
          'trophy'
        );
      END IF;
    END IF;
    
    -- 50 Sessions Milestone
    IF mentor_record.completed_sessions >= 50 THEN
      SELECT EXISTS (
        SELECT 1 FROM mentor_badges 
        WHERE mentor_id = mentor_record.id AND badge_type = 'fifty_sessions'
      ) INTO badge_exists;
      
      IF NOT badge_exists THEN
        INSERT INTO mentor_badges (mentor_id, badge_type, badge_name, badge_description, icon_name)
        VALUES (
          mentor_record.id,
          'fifty_sessions',
          'Mentorship Legend',
          'Completed 50 mentorship sessions',
          'crown'
        );
      END IF;
    END IF;
    
    -- High Rating Badge (4.5+ with at least 5 ratings)
    IF mentor_record.avg_rating >= 4.5 AND mentor_record.rating_count >= 5 THEN
      SELECT EXISTS (
        SELECT 1 FROM mentor_badges 
        WHERE mentor_id = mentor_record.id AND badge_type = 'highly_rated'
      ) INTO badge_exists;
      
      IF NOT badge_exists THEN
        INSERT INTO mentor_badges (mentor_id, badge_type, badge_name, badge_description, icon_name)
        VALUES (
          mentor_record.id,
          'highly_rated',
          'Excellence Award',
          'Maintained 4.5+ star rating with 5+ reviews',
          'heart'
        );
      END IF;
    END IF;
    
    -- Perfect Rating Badge (5.0 with at least 10 ratings)
    IF mentor_record.avg_rating = 5.0 AND mentor_record.rating_count >= 10 THEN
      SELECT EXISTS (
        SELECT 1 FROM mentor_badges 
        WHERE mentor_id = mentor_record.id AND badge_type = 'perfect_rating'
      ) INTO badge_exists;
      
      IF NOT badge_exists THEN
        INSERT INTO mentor_badges (mentor_id, badge_type, badge_name, badge_description, icon_name)
        VALUES (
          mentor_record.id,
          'perfect_rating',
          'Perfect Mentor',
          'Perfect 5.0 rating with 10+ reviews',
          'sparkles'
        );
      END IF;
    END IF;
    
    -- Active Mentor Badge (session in last 30 days)
    IF mentor_record.last_session > NOW() - INTERVAL '30 days' THEN
      SELECT EXISTS (
        SELECT 1 FROM mentor_badges 
        WHERE mentor_id = mentor_record.id AND badge_type = 'active_mentor'
      ) INTO badge_exists;
      
      IF NOT badge_exists THEN
        INSERT INTO mentor_badges (mentor_id, badge_type, badge_name, badge_description, icon_name)
        VALUES (
          mentor_record.id,
          'active_mentor',
          'Active Mentor',
          'Recently active in mentorship',
          'zap'
        );
      END IF;
    ELSE
      -- Remove active badge if no longer active
      DELETE FROM mentor_badges 
      WHERE mentor_id = mentor_record.id AND badge_type = 'active_mentor';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View: Mentor Leaderboard (all-time)
CREATE OR REPLACE VIEW mentor_leaderboard AS
SELECT 
  am.id,
  am.full_name,
  am.current_title,
  am.company,
  am.profile_photo_url,
  am.expertise_areas,
  COUNT(mr.id) as total_sessions,
  COUNT(mr.id) FILTER (WHERE mr.status = 'completed') as completed_sessions,
  COUNT(mr.id) FILTER (WHERE mr.created_at > NOW() - INTERVAL '30 days') as sessions_30d,
  COALESCE(AVG(r.rating), 0) as avg_rating,
  COUNT(r.id) as total_ratings,
  COUNT(DISTINCT mr.mentee_id) as unique_mentees,
  ARRAY_AGG(DISTINCT mb.badge_type) FILTER (WHERE mb.badge_type IS NOT NULL) as badges,
  COUNT(mt.id) FILTER (WHERE mt.is_approved = true) as testimonial_count,
  -- Leaderboard score calculation
  (
    (COUNT(mr.id) FILTER (WHERE mr.status = 'completed') * 10) + -- 10 points per completed session
    (COALESCE(AVG(r.rating), 0) * 20) + -- Up to 100 points for rating
    (COUNT(r.id) * 2) + -- 2 points per rating received
    (COUNT(DISTINCT mr.mentee_id) * 5) + -- 5 points per unique mentee
    (COUNT(mb.id) * 15) -- 15 points per badge
  ) as leaderboard_score,
  ROW_NUMBER() OVER (ORDER BY (
    (COUNT(mr.id) FILTER (WHERE mr.status = 'completed') * 10) +
    (COALESCE(AVG(r.rating), 0) * 20) +
    (COUNT(r.id) * 2) +
    (COUNT(DISTINCT mr.mentee_id) * 5) +
    (COUNT(mb.id) * 15)
  ) DESC) as rank
FROM alumni_mentors am
LEFT JOIN mentor_requests mr ON am.id = mr.mentor_id
LEFT JOIN mentor_ratings r ON am.id = r.mentor_id
LEFT JOIN mentor_badges mb ON am.id = mb.mentor_id
LEFT JOIN mentor_testimonials mt ON am.id = mt.mentor_id
WHERE am.status = 'approved'
GROUP BY am.id, am.full_name, am.current_title, am.company, am.profile_photo_url, am.expertise_areas
HAVING COUNT(mr.id) FILTER (WHERE mr.status = 'completed') > 0
ORDER BY leaderboard_score DESC;

-- View: Monthly Leaderboard (last 30 days)
CREATE OR REPLACE VIEW mentor_leaderboard_monthly AS
SELECT 
  am.id,
  am.full_name,
  am.current_title,
  am.company,
  am.profile_photo_url,
  COUNT(mr.id) FILTER (WHERE mr.created_at > NOW() - INTERVAL '30 days') as sessions_30d,
  COUNT(mr.id) FILTER (WHERE mr.status = 'completed' AND mr.created_at > NOW() - INTERVAL '30 days') as completed_30d,
  COALESCE(AVG(r.rating) FILTER (WHERE r.created_at > NOW() - INTERVAL '30 days'), 0) as avg_rating_30d,
  COUNT(r.id) FILTER (WHERE r.created_at > NOW() - INTERVAL '30 days') as ratings_30d,
  COUNT(DISTINCT mr.mentee_id) FILTER (WHERE mr.created_at > NOW() - INTERVAL '30 days') as unique_mentees_30d,
  (
    (COUNT(mr.id) FILTER (WHERE mr.status = 'completed' AND mr.created_at > NOW() - INTERVAL '30 days') * 10) +
    (COALESCE(AVG(r.rating) FILTER (WHERE r.created_at > NOW() - INTERVAL '30 days'), 0) * 20)
  ) as monthly_score,
  ROW_NUMBER() OVER (ORDER BY (
    (COUNT(mr.id) FILTER (WHERE mr.status = 'completed' AND mr.created_at > NOW() - INTERVAL '30 days') * 10) +
    (COALESCE(AVG(r.rating) FILTER (WHERE r.created_at > NOW() - INTERVAL '30 days'), 0) * 20)
  ) DESC) as rank
FROM alumni_mentors am
LEFT JOIN mentor_requests mr ON am.id = mr.mentor_id
LEFT JOIN mentor_ratings r ON am.id = r.mentor_id
WHERE am.status = 'approved'
GROUP BY am.id, am.full_name, am.current_title, am.company, am.profile_photo_url
HAVING COUNT(mr.id) FILTER (WHERE mr.created_at > NOW() - INTERVAL '30 days') > 0
ORDER BY monthly_score DESC
LIMIT 20;

-- Function to create testimonial
CREATE OR REPLACE FUNCTION create_testimonial(
  p_mentor_id UUID,
  p_mentee_id UUID,
  p_request_id UUID,
  p_testimonial TEXT
)
RETURNS UUID AS $$
DECLARE
  new_testimonial_id UUID;
  request_exists BOOLEAN;
BEGIN
  -- Verify the mentee actually had a completed session with this mentor
  SELECT EXISTS (
    SELECT 1 FROM mentor_requests
    WHERE id = p_request_id
      AND mentor_id = p_mentor_id
      AND mentee_id = p_mentee_id
      AND status = 'completed'
  ) INTO request_exists;
  
  IF NOT request_exists THEN
    RAISE EXCEPTION 'Cannot create testimonial: No completed session found';
  END IF;
  
  -- Check if testimonial already exists for this request
  SELECT id INTO new_testimonial_id FROM mentor_testimonials
  WHERE request_id = p_request_id;
  
  IF new_testimonial_id IS NOT NULL THEN
    -- Update existing testimonial
    UPDATE mentor_testimonials
    SET testimonial = p_testimonial,
        updated_at = NOW()
    WHERE id = new_testimonial_id;
  ELSE
    -- Create new testimonial
    INSERT INTO mentor_testimonials (mentor_id, mentee_id, request_id, testimonial)
    VALUES (p_mentor_id, p_mentee_id, p_request_id, p_testimonial)
    RETURNING id INTO new_testimonial_id;
  END IF;
  
  RETURN new_testimonial_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON mentor_badges TO authenticated;
GRANT SELECT ON mentor_testimonials TO authenticated;
GRANT SELECT ON mentor_leaderboard TO authenticated;
GRANT SELECT ON mentor_leaderboard_monthly TO authenticated;
GRANT EXECUTE ON FUNCTION award_mentor_badges TO authenticated;
GRANT EXECUTE ON FUNCTION create_testimonial TO authenticated;

-- Add comments
COMMENT ON TABLE mentor_badges IS 'Achievement badges earned by mentors for milestones';
COMMENT ON TABLE mentor_testimonials IS 'Testimonials from mentees about their mentorship experience';
COMMENT ON VIEW mentor_leaderboard IS 'All-time leaderboard ranking mentors by performance score';
COMMENT ON VIEW mentor_leaderboard_monthly IS 'Monthly leaderboard showing top 20 active mentors';
COMMENT ON FUNCTION award_mentor_badges IS 'Automatically award badges based on mentor achievements';
COMMENT ON FUNCTION create_testimonial IS 'Create or update a testimonial for a completed mentorship session';

-- Note: Set up a cron job to run award_mentor_badges() daily
-- Example with pg_cron extension:
-- SELECT cron.schedule('award-badges', '0 3 * * *', 'SELECT award_mentor_badges();');
