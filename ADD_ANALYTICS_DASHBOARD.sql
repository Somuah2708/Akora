-- Migration: Add Analytics Dashboard Views
-- Description: Create views and functions for admin analytics dashboard
-- Created: 2025-11-17

-- View: Daily mentorship activity metrics
CREATE OR REPLACE VIEW analytics_daily_activity AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_requests,
  COUNT(*) FILTER (WHERE status = 'accepted') as accepted_requests,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_requests,
  COUNT(*) FILTER (WHERE status = 'declined') as declined_requests,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_requests
FROM mentor_requests
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View: Monthly mentorship trends
CREATE OR REPLACE VIEW analytics_monthly_trends AS
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'accepted') as accepted_requests,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_requests,
  COUNT(*) FILTER (WHERE status = 'declined') as declined_requests,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'accepted' OR status = 'completed')::NUMERIC / 
    NULLIF(COUNT(*)::NUMERIC, 0) * 100, 
    2
  ) as acceptance_rate,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / 
    NULLIF(COUNT(*) FILTER (WHERE status = 'accepted' OR status = 'completed')::NUMERIC, 0) * 100,
    2
  ) as completion_rate
FROM mentor_requests
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- View: Mentor engagement metrics
CREATE OR REPLACE VIEW analytics_mentor_engagement AS
SELECT 
  am.id,
  am.full_name,
  am.email,
  am.expertise_areas,
  am.status,
  COUNT(mr.id) as total_requests,
  COUNT(mr.id) FILTER (WHERE mr.status = 'accepted') as accepted_requests,
  COUNT(mr.id) FILTER (WHERE mr.status = 'completed') as completed_requests,
  COUNT(mr.id) FILTER (WHERE mr.status = 'pending') as pending_requests,
  COALESCE(AVG(r.rating), 0) as avg_rating,
  COUNT(r.id) as total_ratings,
  ROUND(
    COUNT(mr.id) FILTER (WHERE mr.status = 'accepted' OR mr.status = 'completed')::NUMERIC / 
    NULLIF(COUNT(mr.id)::NUMERIC, 0) * 100,
    2
  ) as acceptance_rate,
  MAX(mr.created_at) as last_request_date,
  CASE 
    WHEN MAX(mr.created_at) > NOW() - INTERVAL '30 days' THEN 'active'
    WHEN MAX(mr.created_at) > NOW() - INTERVAL '90 days' THEN 'semi-active'
    ELSE 'inactive'
  END as engagement_level
FROM alumni_mentors am
LEFT JOIN mentor_requests mr ON am.id = mr.mentor_id
LEFT JOIN mentor_ratings r ON am.id = r.mentor_id
WHERE am.status = 'approved'
GROUP BY am.id, am.full_name, am.email, am.expertise_areas, am.status
ORDER BY total_requests DESC, avg_rating DESC;

-- View: Expertise area popularity
CREATE OR REPLACE VIEW analytics_expertise_popularity AS
SELECT 
  expertise,
  COUNT(*) as request_count,
  COUNT(*) FILTER (WHERE mr.status = 'accepted' OR mr.status = 'completed') as successful_matches,
  ROUND(
    COUNT(*) FILTER (WHERE mr.status = 'accepted' OR mr.status = 'completed')::NUMERIC /
    NULLIF(COUNT(*)::NUMERIC, 0) * 100,
    2
  ) as success_rate,
  COUNT(DISTINCT mr.mentee_id) as unique_mentees,
  COUNT(DISTINCT mr.mentor_id) as mentors_in_area
FROM mentor_requests mr
CROSS JOIN LATERAL unnest(mr.areas_of_interest) AS expertise
GROUP BY expertise
ORDER BY request_count DESC;

-- View: Response time analytics
-- Note: Uses mentor_response field presence as proxy for response time since responded_at column doesn't exist
CREATE OR REPLACE VIEW analytics_response_times AS
SELECT 
  DATE(mr.created_at) as date,
  COUNT(*) FILTER (WHERE mr.mentor_response IS NOT NULL AND mr.mentor_response != '') as responded_requests,
  COUNT(*) FILTER (WHERE mr.status = 'accepted') as accepted_requests,
  COUNT(*) FILTER (WHERE mr.status = 'declined') as declined_requests,
  COUNT(*) FILTER (WHERE mr.status = 'pending') as pending_requests,
  ROUND(
    COUNT(*) FILTER (WHERE mr.mentor_response IS NOT NULL AND mr.mentor_response != '')::NUMERIC /
    NULLIF(COUNT(*)::NUMERIC, 0) * 100,
    2
  ) as response_rate
FROM mentor_requests mr
GROUP BY DATE(mr.created_at)
ORDER BY date DESC;

-- View: Overall program statistics
CREATE OR REPLACE VIEW analytics_program_overview AS
SELECT 
  (SELECT COUNT(*) FROM alumni_mentors WHERE status = 'approved') as total_mentors,
  (SELECT COUNT(*) FROM alumni_mentors WHERE status = 'approved' AND created_at > NOW() - INTERVAL '30 days') as new_mentors_30d,
  (SELECT COUNT(*) FROM mentor_requests) as total_requests,
  (SELECT COUNT(*) FROM mentor_requests WHERE created_at > NOW() - INTERVAL '30 days') as requests_30d,
  (SELECT COUNT(*) FROM mentor_requests WHERE status = 'completed') as completed_sessions,
  (SELECT COUNT(DISTINCT mentee_id) FROM mentor_requests) as unique_mentees,
  (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM mentor_ratings) as avg_platform_rating,
  (SELECT COUNT(*) FROM mentor_ratings) as total_ratings,
  (SELECT ROUND(
    COUNT(*) FILTER (WHERE status = 'accepted' OR status = 'completed')::NUMERIC /
    NULLIF(COUNT(*)::NUMERIC, 0) * 100,
    2
  ) FROM mentor_requests) as overall_acceptance_rate,
  (SELECT ROUND(
    COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE status = 'accepted' OR status = 'completed')::NUMERIC, 0) * 100,
    2
  ) FROM mentor_requests) as overall_completion_rate;

-- View: Top performing mentors (last 30 days)
CREATE OR REPLACE VIEW analytics_top_mentors AS
SELECT 
  am.id,
  am.full_name,
  am.current_title,
  am.company,
  COUNT(mr.id) as requests_30d,
  COUNT(mr.id) FILTER (WHERE mr.status = 'completed') as completed_30d,
  COALESCE(AVG(r.rating), 0) as avg_rating,
  COUNT(r.id) as rating_count
FROM alumni_mentors am
JOIN mentor_requests mr ON am.id = mr.mentor_id AND mr.created_at > NOW() - INTERVAL '30 days'
LEFT JOIN mentor_ratings r ON am.id = r.mentor_id
WHERE am.status = 'approved'
GROUP BY am.id, am.full_name, am.current_title, am.company
HAVING COUNT(mr.id) >= 3
ORDER BY completed_30d DESC, avg_rating DESC
LIMIT 10;

-- Function to get analytics date range data
CREATE OR REPLACE FUNCTION get_analytics_date_range(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  date DATE,
  new_requests BIGINT,
  accepted_requests BIGINT,
  completed_requests BIGINT,
  declined_requests BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.date::DATE,
    COALESCE(COUNT(mr.id) FILTER (WHERE DATE(mr.created_at) = d.date), 0) as new_requests,
    COALESCE(COUNT(mr.id) FILTER (WHERE DATE(mr.created_at) = d.date AND mr.status = 'accepted'), 0) as accepted_requests,
    COALESCE(COUNT(mr.id) FILTER (WHERE DATE(mr.created_at) = d.date AND mr.status = 'completed'), 0) as completed_requests,
    COALESCE(COUNT(mr.id) FILTER (WHERE DATE(mr.created_at) = d.date AND mr.status = 'declined'), 0) as declined_requests
  FROM generate_series(start_date, end_date, '1 day'::interval) d(date)
  LEFT JOIN mentor_requests mr ON DATE(mr.created_at) = d.date::DATE
  GROUP BY d.date
  ORDER BY d.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON analytics_daily_activity TO authenticated;
GRANT SELECT ON analytics_monthly_trends TO authenticated;
GRANT SELECT ON analytics_mentor_engagement TO authenticated;
GRANT SELECT ON analytics_expertise_popularity TO authenticated;
GRANT SELECT ON analytics_response_times TO authenticated;
GRANT SELECT ON analytics_program_overview TO authenticated;
GRANT SELECT ON analytics_top_mentors TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_date_range TO authenticated;

-- Add RLS policies (admin-only access)
ALTER TABLE IF EXISTS analytics_daily_activity SET (security_invoker = on);
ALTER TABLE IF EXISTS analytics_monthly_trends SET (security_invoker = on);
ALTER TABLE IF EXISTS analytics_mentor_engagement SET (security_invoker = on);

-- Add comments
COMMENT ON VIEW analytics_daily_activity IS 'Daily breakdown of mentorship request activity';
COMMENT ON VIEW analytics_monthly_trends IS 'Monthly trends showing acceptance and completion rates';
COMMENT ON VIEW analytics_mentor_engagement IS 'Individual mentor performance and engagement metrics';
COMMENT ON VIEW analytics_expertise_popularity IS 'Most requested expertise areas and their success rates';
COMMENT ON VIEW analytics_response_times IS 'Response rate analytics by date (based on mentor_response field)';
COMMENT ON VIEW analytics_program_overview IS 'Overall mentorship program statistics';
COMMENT ON VIEW analytics_top_mentors IS 'Top 10 performing mentors in the last 30 days';
COMMENT ON FUNCTION get_analytics_date_range IS 'Get analytics data for a specific date range';
