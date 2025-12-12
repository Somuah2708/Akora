-- Test Query: Mark a campaign as completed to preview the completed campaigns section
-- This will help you see how the completed campaigns card looks

-- OPTION 1: Mark the first active campaign as completed (temporary for testing)
-- Run this to see the completed campaigns section:
UPDATE donation_campaigns
SET status = 'completed',
    current_amount = goal_amount
WHERE status = 'active'
  AND id = (
    SELECT id 
    FROM donation_campaigns 
    WHERE status = 'active' 
    ORDER BY created_at DESC 
    LIMIT 1
  );

-- OPTION 2: Mark a specific campaign by title (replace 'Your Campaign Title' with actual title)
-- UPDATE donation_campaigns
-- SET status = 'completed',
--     current_amount = goal_amount
-- WHERE title = 'Your Campaign Title';

-- OPTION 3: Mark a specific campaign by ID (replace 'campaign-id-here' with actual ID)
-- UPDATE donation_campaigns
-- SET status = 'completed',
--     current_amount = goal_amount
-- WHERE id = 'campaign-id-here';

-- To UNDO and revert it back to active (if needed):
-- UPDATE donation_campaigns
-- SET status = 'active',
--     current_amount = 0
-- WHERE status = 'completed'
--   AND id = 'campaign-id-here';

-- To view all completed campaigns:
-- SELECT id, title, category, goal_amount, current_amount, status, donors_count
-- FROM donation_campaigns
-- WHERE status = 'completed'
-- ORDER BY created_at DESC;
