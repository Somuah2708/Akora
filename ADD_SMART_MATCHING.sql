-- =============================================
-- SMART MENTOR MATCHING SYSTEM
-- =============================================
-- AI-powered mentor recommendations based on user preferences,
-- expertise matching, ratings, and availability

-- User matching preferences table
CREATE TABLE IF NOT EXISTS user_matching_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  career_goals TEXT[],
  preferred_industries TEXT[],
  preferred_expertise TEXT[],
  preferred_meeting_formats TEXT[],
  min_years_experience INTEGER DEFAULT 0,
  min_rating DECIMAL(2,1) DEFAULT 0 CHECK (min_rating >= 0 AND min_rating <= 5),
  only_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mentor recommendations table
CREATE TABLE IF NOT EXISTS mentor_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_score DECIMAL(3,2) CHECK (match_score >= 0 AND match_score <= 1),
  match_reasons JSONB, -- Array of reason objects
  expertise_match TEXT[], -- Matched expertise areas
  industry_match BOOLEAN DEFAULT false,
  rating_weight DECIMAL(3,2),
  availability_weight DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_matching_prefs_user ON user_matching_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_score ON mentor_recommendations(user_id, match_score DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_expires ON mentor_recommendations(expires_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_mentor ON mentor_recommendations(mentor_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_user_mentor_created ON mentor_recommendations(user_id, mentor_id, created_at);

-- RLS Policies
ALTER TABLE user_matching_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own preferences" ON user_matching_preferences;
CREATE POLICY "Users can view their own preferences"
  ON user_matching_preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON user_matching_preferences;
CREATE POLICY "Users can update their own preferences"
  ON user_matching_preferences FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_matching_preferences;
CREATE POLICY "Users can insert their own preferences"
  ON user_matching_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own recommendations" ON mentor_recommendations;
CREATE POLICY "Users can view their own recommendations"
  ON mentor_recommendations FOR SELECT
  USING (auth.uid() = user_id);

-- Function to calculate mentor match score
CREATE OR REPLACE FUNCTION calculate_mentor_match_score(
  p_user_id UUID,
  p_mentor_id UUID
)
RETURNS TABLE (
  match_score DECIMAL(3,2),
  match_reasons JSONB,
  expertise_match TEXT[],
  industry_match BOOLEAN,
  rating_weight DECIMAL(3,2),
  availability_weight DECIMAL(3,2)
) AS $$
DECLARE
  v_user_prefs RECORD;
  v_mentor RECORD;
  v_score DECIMAL(3,2) := 0;
  v_reasons JSONB := '[]'::jsonb;
  v_expertise_matches TEXT[];
  v_industry_match BOOLEAN := false;
  v_rating_w DECIMAL(3,2) := 0;
  v_avail_w DECIMAL(3,2) := 0;
  v_expertise_match_ratio DECIMAL(3,2);
BEGIN
  -- Get user preferences
  SELECT * INTO v_user_prefs
  FROM user_matching_preferences
  WHERE user_id = p_user_id;

  -- Get mentor details
  SELECT * INTO v_mentor
  FROM alumni_mentors
  WHERE user_id = p_mentor_id AND status = 'approved';

  -- If mentor not found or user has no preferences, return default low score
  IF v_mentor IS NULL THEN
    RETURN QUERY SELECT 0::DECIMAL(3,2), '[]'::jsonb, ARRAY[]::TEXT[], false, 0::DECIMAL(3,2), 0::DECIMAL(3,2);
    RETURN;
  END IF;

  -- If no preferences exist, use simple rating-based matching
  IF v_user_prefs IS NULL THEN
    v_score := COALESCE(v_mentor.average_rating / 5.0, 0.5);
    v_reasons := jsonb_build_array(
      jsonb_build_object('type', 'rating', 'value', 'Highly rated mentor')
    );
    RETURN QUERY SELECT v_score, v_reasons, ARRAY[]::TEXT[], false, v_score, 0::DECIMAL(3,2);
    RETURN;
  END IF;

  -- Calculate expertise match (40% weight)
  IF v_user_prefs.preferred_expertise IS NOT NULL AND array_length(v_user_prefs.preferred_expertise, 1) > 0 
     AND v_mentor.expertise_areas IS NOT NULL AND array_length(v_mentor.expertise_areas, 1) > 0 THEN
    
    v_expertise_matches := ARRAY(
      SELECT UNNEST(v_user_prefs.preferred_expertise)
      INTERSECT
      SELECT UNNEST(v_mentor.expertise_areas)
    );
    
    IF array_length(v_expertise_matches, 1) > 0 THEN
      v_expertise_match_ratio := array_length(v_expertise_matches, 1)::DECIMAL / array_length(v_user_prefs.preferred_expertise, 1)::DECIMAL;
      v_score := v_score + (0.4 * v_expertise_match_ratio);
      v_reasons := v_reasons || jsonb_build_object(
        'type', 'expertise', 
        'value', array_length(v_expertise_matches, 1) || ' matching expertise area' || 
                 CASE WHEN array_length(v_expertise_matches, 1) > 1 THEN 's' ELSE '' END
      );
    END IF;
  END IF;

  -- Calculate industry match (20% weight)
  IF v_user_prefs.preferred_industries IS NOT NULL 
     AND v_mentor.industry IS NOT NULL 
     AND v_mentor.industry = ANY(v_user_prefs.preferred_industries) THEN
    v_industry_match := true;
    v_score := v_score + 0.2;
    v_reasons := v_reasons || jsonb_build_object(
      'type', 'industry', 
      'value', 'Works in your preferred industry'
    );
  END IF;

  -- Calculate rating weight (20% weight)
  IF v_mentor.average_rating IS NOT NULL AND v_mentor.average_rating >= v_user_prefs.min_rating THEN
    v_rating_w := LEAST(v_mentor.average_rating / 5.0, 1.0);
    v_score := v_score + (0.2 * v_rating_w);
    IF v_mentor.average_rating >= 4.5 THEN
      v_reasons := v_reasons || jsonb_build_object(
        'type', 'rating', 
        'value', 'Highly rated (' || ROUND(v_mentor.average_rating, 1) || '/5)'
      );
    END IF;
  END IF;

  -- Calculate experience weight (10% weight)
  IF v_mentor.years_of_experience >= v_user_prefs.min_years_experience THEN
    v_score := v_score + 0.1;
    IF v_mentor.years_of_experience >= 10 THEN
      v_reasons := v_reasons || jsonb_build_object(
        'type', 'experience', 
        'value', v_mentor.years_of_experience || '+ years of experience'
      );
    END IF;
  END IF;

  -- Availability bonus (10% weight)
  IF v_mentor.is_available = true THEN
    v_avail_w := 1.0;
    v_score := v_score + 0.1;
    v_reasons := v_reasons || jsonb_build_object(
      'type', 'availability', 
      'value', 'Currently accepting mentees'
    );
  END IF;

  -- Meeting format match bonus (small boost)
  IF v_user_prefs.preferred_meeting_formats IS NOT NULL 
     AND v_mentor.meeting_formats IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM UNNEST(v_user_prefs.preferred_meeting_formats) pf
      WHERE pf = ANY(v_mentor.meeting_formats)
    ) THEN
      v_score := LEAST(v_score + 0.05, 1.0); -- Small bonus, cap at 1.0
      v_reasons := v_reasons || jsonb_build_object(
        'type', 'format', 
        'value', 'Offers your preferred meeting format'
      );
    END IF;
  END IF;

  RETURN QUERY SELECT 
    LEAST(v_score, 1.0), -- Cap at 1.0
    v_reasons,
    COALESCE(v_expertise_matches, ARRAY[]::TEXT[]),
    v_industry_match,
    v_rating_w,
    v_avail_w;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate recommendations for a user
CREATE OR REPLACE FUNCTION generate_mentor_recommendations(
  p_user_id UUID, 
  p_limit INTEGER DEFAULT 10,
  p_refresh BOOLEAN DEFAULT false
)
RETURNS SETOF mentor_recommendations AS $$
BEGIN
  -- Delete old recommendations if refreshing or expired
  IF p_refresh THEN
    DELETE FROM mentor_recommendations WHERE user_id = p_user_id;
  ELSE
    DELETE FROM mentor_recommendations WHERE user_id = p_user_id AND expires_at < NOW();
  END IF;

  -- Check if we have recent valid recommendations
  IF EXISTS (
    SELECT 1 FROM mentor_recommendations 
    WHERE user_id = p_user_id AND expires_at > NOW()
  ) AND NOT p_refresh THEN
    -- Return existing recommendations
    RETURN QUERY
    SELECT * FROM mentor_recommendations
    WHERE user_id = p_user_id AND expires_at > NOW()
    ORDER BY match_score DESC
    LIMIT p_limit;
    RETURN;
  END IF;

  -- Generate new recommendations
  RETURN QUERY
  INSERT INTO mentor_recommendations (
    user_id,
    mentor_id,
    match_score,
    match_reasons,
    expertise_match,
    industry_match,
    rating_weight,
    availability_weight
  )
  SELECT
    p_user_id,
    am.user_id,
    ms.match_score,
    ms.match_reasons,
    ms.expertise_match,
    ms.industry_match,
    ms.rating_weight,
    ms.availability_weight
  FROM alumni_mentors am
  CROSS JOIN LATERAL calculate_mentor_match_score(p_user_id, am.user_id) ms
  WHERE am.status = 'approved'
    AND am.user_id != p_user_id
    AND ms.match_score > 0.3 -- Minimum threshold
  ORDER BY ms.match_score DESC, am.average_rating DESC NULLS LAST
  LIMIT p_limit
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top recommendations with mentor details
CREATE OR REPLACE FUNCTION get_top_mentor_recommendations(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  recommendation_id UUID,
  mentor_id UUID,
  match_score DECIMAL(3,2),
  match_reasons JSONB,
  expertise_match TEXT[],
  full_name TEXT,
  current_title TEXT,
  company TEXT,
  profile_photo_url TEXT,
  expertise_areas TEXT[],
  average_rating DECIMAL(2,1),
  total_ratings INTEGER,
  years_of_experience INTEGER
) AS $$
BEGIN
  -- Generate recommendations if needed
  PERFORM generate_mentor_recommendations(p_user_id, p_limit, false);

  -- Return recommendations with mentor details
  RETURN QUERY
  SELECT 
    mr.id as recommendation_id,
    mr.mentor_id,
    mr.match_score,
    mr.match_reasons,
    mr.expertise_match,
    am.full_name,
    am.current_title,
    am.company,
    am.profile_photo_url,
    am.expertise_areas,
    am.average_rating,
    am.total_ratings,
    am.years_of_experience
  FROM mentor_recommendations mr
  JOIN alumni_mentors am ON am.user_id = mr.mentor_id
  WHERE mr.user_id = p_user_id
    AND mr.expires_at > NOW()
  ORDER BY mr.match_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_matching_preferences TO authenticated;
GRANT SELECT ON mentor_recommendations TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_mentor_match_score TO authenticated;
GRANT EXECUTE ON FUNCTION generate_mentor_recommendations TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_mentor_recommendations TO authenticated;

-- Add comments
COMMENT ON TABLE user_matching_preferences IS 'User preferences for mentor matching algorithm';
COMMENT ON TABLE mentor_recommendations IS 'AI-generated mentor recommendations with match scores';
COMMENT ON FUNCTION calculate_mentor_match_score IS 'Calculate match score between user and mentor';
COMMENT ON FUNCTION generate_mentor_recommendations IS 'Generate new mentor recommendations for a user';
COMMENT ON FUNCTION get_top_mentor_recommendations IS 'Get top recommendations with full mentor details';
