-- =====================================================
-- INCREMENT FUNCTIONS FOR SECRETARIAT EVENTS
-- For atomic updates to view_count and registration_count
-- =====================================================

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS increment_event_view_count(UUID);
DROP FUNCTION IF EXISTS increment_event_registration_count(UUID);
DROP FUNCTION IF EXISTS increment_event_interest_count(UUID);

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_event_view_count(event_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE secretariat_events
  SET view_count = view_count + 1
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment registration count
CREATE OR REPLACE FUNCTION increment_event_registration_count(event_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE secretariat_events
  SET registration_count = registration_count + 1
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment interest count
CREATE OR REPLACE FUNCTION increment_event_interest_count(event_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE secretariat_events
  SET interest_count = interest_count + 1
  WHERE id = event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_event_view_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_event_registration_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_event_interest_count(UUID) TO authenticated;

-- Comments
COMMENT ON FUNCTION increment_event_view_count IS 'Atomically increments the view count for an event';
COMMENT ON FUNCTION increment_event_registration_count IS 'Atomically increments the registration count for an event';
COMMENT ON FUNCTION increment_event_interest_count IS 'Atomically increments the interest count for an event';
