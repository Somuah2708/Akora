-- Remove the News button from the homepage category tabs
-- This can be run in Supabase SQL Editor to remove it from the database

-- Option 1: Deactivate the News tab (recommended - keeps data but hides it)
UPDATE home_category_tabs
SET is_active = false
WHERE title = 'News';

-- Option 2: Permanently delete the News tab (uncomment to use)
-- DELETE FROM home_category_tabs
-- WHERE title = 'News';

-- Verify the update
SELECT id, title, route, is_active, order_index
FROM home_category_tabs
ORDER BY order_index;
