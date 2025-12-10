-- MANAGE_FEATURED_CAMPAIGN.sql
-- Helper queries for managing the featured campaign

-- View all active campaigns
SELECT 
  id, 
  title, 
  status, 
  is_featured,
  current_amount,
  goal_amount,
  created_at
FROM donation_campaigns 
WHERE status = 'active'
ORDER BY is_featured DESC, created_at DESC;

-- =====================================================
-- TO FEATURE A CAMPAIGN (replace 'CAMPAIGN_ID' with actual ID)
-- =====================================================
UPDATE donation_campaigns 
SET is_featured = true 
WHERE id = 'CAMPAIGN_ID';

-- =====================================================
-- TO UNFEATURE ALL CAMPAIGNS
-- =====================================================
UPDATE donation_campaigns 
SET is_featured = false;

-- =====================================================
-- CHECK CURRENT FEATURED CAMPAIGN
-- =====================================================
SELECT id, title, category, is_featured
FROM donation_campaigns 
WHERE is_featured = true;
