-- ADD_FEATURED_CAMPAIGN_FLAG.sql
-- Adds is_featured column to donation_campaigns table

-- Add the is_featured column
ALTER TABLE donation_campaigns 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_campaigns_featured ON donation_campaigns(is_featured) WHERE is_featured = true;

-- Only allow one featured campaign at a time (constraint via trigger)
CREATE OR REPLACE FUNCTION ensure_single_featured_campaign()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_featured = true THEN
    -- Unfeature all other campaigns
    UPDATE donation_campaigns 
    SET is_featured = false 
    WHERE id != NEW.id AND is_featured = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_single_featured_campaign ON donation_campaigns;
CREATE TRIGGER trigger_single_featured_campaign
  BEFORE INSERT OR UPDATE OF is_featured ON donation_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_featured_campaign();

-- Set the first active campaign as featured (for testing)
UPDATE donation_campaigns 
SET is_featured = true 
WHERE id = (
  SELECT id FROM donation_campaigns 
  WHERE status = 'active' 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Verify
SELECT id, title, status, is_featured 
FROM donation_campaigns 
ORDER BY is_featured DESC, created_at DESC;
