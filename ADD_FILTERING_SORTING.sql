-- =============================================
-- REQUEST FILTERING AND SORTING ENHANCEMENTS
-- =============================================
-- Adds indexes and views to optimize filtering and sorting
-- Improves query performance for dashboards

-- Add indexes for common filter/sort operations
CREATE INDEX IF NOT EXISTS idx_mentor_requests_status_created 
ON mentor_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentor_requests_mentee_status 
ON mentor_requests(mentee_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentor_requests_mentor_status 
ON mentor_requests(mentor_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mentor_requests_created_at 
ON mentor_requests(created_at DESC);

-- Add gin index for full-text search on mentee_name
CREATE INDEX IF NOT EXISTS idx_mentor_requests_mentee_name_search 
ON mentor_requests USING gin(to_tsvector('english', mentee_name));

-- Add index for alumni_mentors search
CREATE INDEX IF NOT EXISTS idx_alumni_mentors_search 
ON alumni_mentors USING gin(
  to_tsvector('english', 
    COALESCE(full_name, '') || ' ' || 
    COALESCE(current_title, '') || ' ' || 
    COALESCE(company, '') || ' ' ||
    COALESCE(array_to_string(expertise_areas, ' '), '')
  )
);

-- View for mentor request statistics by date range
CREATE OR REPLACE VIEW mentor_request_stats AS
SELECT
  DATE_TRUNC('day', created_at) as request_date,
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7_days,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as last_30_days
FROM mentor_requests
GROUP BY DATE_TRUNC('day', created_at), status;

-- View for mentor performance metrics
CREATE OR REPLACE VIEW mentor_performance_metrics AS
SELECT
  am.id as mentor_id,
  am.full_name,
  am.email,
  COUNT(mr.id) as total_requests,
  COUNT(mr.id) FILTER (WHERE mr.status = 'accepted') as accepted_count,
  COUNT(mr.id) FILTER (WHERE mr.status = 'declined') as declined_count,
  COUNT(mr.id) FILTER (WHERE mr.status = 'completed') as completed_count,
  COUNT(mr.id) FILTER (WHERE mr.status = 'pending') as pending_count,
  ROUND(
    COUNT(mr.id) FILTER (WHERE mr.status = 'accepted')::numeric * 100.0 / 
    NULLIF(COUNT(mr.id) FILTER (WHERE mr.status IN ('accepted', 'declined')), 0),
    2
  ) as acceptance_rate,
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (mr.updated_at - mr.created_at)) / 3600
    ) FILTER (WHERE mr.status IN ('accepted', 'declined')),
    2
  ) as avg_response_time_hours,
  am.average_rating,
  am.total_ratings
FROM alumni_mentors am
LEFT JOIN mentor_requests mr ON mr.mentor_id = am.id
WHERE am.status = 'approved'
GROUP BY am.id, am.full_name, am.email, am.average_rating, am.total_ratings;

-- Function to search mentor requests with filters
CREATE OR REPLACE FUNCTION search_mentor_requests(
  p_user_id UUID,
  p_user_role TEXT,
  p_status TEXT DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  mentee_id UUID,
  mentor_id UUID,
  mentee_name TEXT,
  mentee_email TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  mentor_name TEXT,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_requests AS (
    SELECT
      mr.id,
      mr.mentee_id,
      mr.mentor_id,
      mr.mentee_name,
      mr.mentee_email,
      mr.status::TEXT,
      mr.created_at,
      am.full_name as mentor_name,
      COUNT(*) OVER() as total_count
    FROM mentor_requests mr
    LEFT JOIN alumni_mentors am ON am.id = mr.mentor_id
    WHERE
      -- Role-based filtering
      CASE
        WHEN p_user_role = 'admin' THEN true
        WHEN p_user_role = 'mentor' THEN mr.mentor_id IN (
          SELECT id FROM alumni_mentors WHERE user_id = p_user_id
        )
        ELSE mr.mentee_id = p_user_id
      END
      -- Status filter
      AND (p_status IS NULL OR mr.status::TEXT = p_status)
      -- Search filter
      AND (
        p_search_term IS NULL OR
        mr.mentee_name ILIKE '%' || p_search_term || '%' OR
        am.full_name ILIKE '%' || p_search_term || '%'
      )
      -- Date range filter
      AND (p_date_from IS NULL OR mr.created_at >= p_date_from)
      AND (p_date_to IS NULL OR mr.created_at <= p_date_to)
  )
  SELECT *
  FROM filtered_requests
  ORDER BY
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN created_at END DESC,
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN created_at END ASC,
    CASE WHEN p_sort_by = 'mentee_name' AND p_sort_order = 'desc' THEN mentee_name END DESC,
    CASE WHEN p_sort_by = 'mentee_name' AND p_sort_order = 'asc' THEN mentee_name END ASC,
    CASE WHEN p_sort_by = 'status' AND p_sort_order = 'desc' THEN status END DESC,
    CASE WHEN p_sort_by = 'status' AND p_sort_order = 'asc' THEN status END ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comments
COMMENT ON VIEW mentor_request_stats IS 'Daily statistics of mentor requests by status';
COMMENT ON VIEW mentor_performance_metrics IS 'Performance metrics for each approved mentor';
COMMENT ON FUNCTION search_mentor_requests IS 'Search and filter mentor requests with pagination and sorting';
