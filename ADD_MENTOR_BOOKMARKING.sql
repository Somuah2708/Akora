-- Migration: Add Mentor Favorites/Bookmarking
-- Description: Enable users to bookmark favorite mentors
-- Created: 2025-11-17

-- mentor_favorites table already exists from earlier migration
-- Adding additional functionality and views

-- Create view for user's favorite mentors with full details
CREATE OR REPLACE VIEW user_favorite_mentors AS
SELECT 
  mf.user_id,
  mf.mentor_id,
  mf.created_at as favorited_at,
  am.full_name,
  am.current_title,
  am.company,
  am.expertise_areas,
  am.years_of_experience,
  am.meeting_formats,
  am.available_hours,
  am.profile_photo_url,
  am.average_rating,
  am.total_ratings,
  am.status
FROM mentor_favorites mf
JOIN alumni_mentors am ON mf.mentor_id = am.user_id
WHERE am.status = 'approved';

-- Function to toggle favorite (add if not exists, remove if exists)
CREATE OR REPLACE FUNCTION toggle_mentor_favorite(
  p_user_id UUID,
  p_mentor_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
  v_is_favorited BOOLEAN;
BEGIN
  -- Check if already favorited
  SELECT EXISTS(
    SELECT 1 FROM mentor_favorites
    WHERE user_id = p_user_id AND mentor_id = p_mentor_id
  ) INTO v_exists;
  
  IF v_exists THEN
    -- Remove from favorites
    DELETE FROM mentor_favorites
    WHERE user_id = p_user_id AND mentor_id = p_mentor_id;
    v_is_favorited := false;
  ELSE
    -- Add to favorites
    INSERT INTO mentor_favorites (user_id, mentor_id)
    VALUES (p_user_id, p_mentor_id);
    v_is_favorited := true;
  END IF;
  
  RETURN v_is_favorited;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's favorite mentor IDs (for quick checks)
CREATE OR REPLACE FUNCTION get_user_favorite_mentor_ids(p_user_id UUID)
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT mentor_id 
    FROM mentor_favorites 
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for faster favorite lookups
CREATE INDEX IF NOT EXISTS idx_favorites_user_mentor ON mentor_favorites(user_id, mentor_id);

-- Grant permissions
GRANT SELECT ON user_favorite_mentors TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_mentor_favorite TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_favorite_mentor_ids TO authenticated;

-- Add comments
COMMENT ON VIEW user_favorite_mentors IS 'Complete details of mentors favorited by users';
COMMENT ON FUNCTION toggle_mentor_favorite IS 'Add or remove a mentor from user favorites';
COMMENT ON FUNCTION get_user_favorite_mentor_ids IS 'Get array of mentor IDs favorited by a user';
