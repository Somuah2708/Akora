-- SHOW SECRETARIAT_ANNOUNCEMENTS TABLE STRUCTURE
-- Run this to see all columns in the table

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'secretariat_announcements'
ORDER BY ordinal_position;
