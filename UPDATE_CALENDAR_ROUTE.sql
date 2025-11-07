-- Update the Calendar tab route to show OAA events instead of academic calendar
-- This ensures the Calendar button in the home section displays OAA alumni events
-- (like homecoming, sports festivals, galas, etc.) rather than student academic events
-- (like mid-term exams, term schedules, etc.)

UPDATE home_category_tabs
SET route = '/secretariat/event-calendar'
WHERE title = 'Calendar' AND route = '/calendar';

-- Verify the update
SELECT id, title, route, is_active 
FROM home_category_tabs 
WHERE title = 'Calendar';
