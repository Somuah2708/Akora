-- Remove all subcategory selections from user_interests table
-- Only keep parent/main category selections
-- Subcategories follow pattern: parent_subcategory (contains underscore)

DELETE FROM user_interests
WHERE category LIKE '%\_%' ESCAPE '\';

-- Add helpful comment
COMMENT ON TABLE user_interests IS 'Stores user preferences for top-level content categories only (no subcategories)';

-- Show what was cleaned up
SELECT 'Cleanup complete. Removed all subcategory entries from user_interests.' AS status;
