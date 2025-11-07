-- Optional: Add view counter function for forum discussions
-- This function increments the view count when a discussion is opened

-- Create the function
CREATE OR REPLACE FUNCTION increment_discussion_views(discussion_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE forum_discussions
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = discussion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_discussion_views(uuid) TO authenticated;

-- Test the function (replace 'your-discussion-id' with a real ID)
-- SELECT increment_discussion_views('your-discussion-id');
-- SELECT views_count FROM forum_discussions WHERE id = 'your-discussion-id';
