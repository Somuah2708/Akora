-- Migration: Add automatic campaign completion when goal is reached
-- This trigger automatically updates campaign status to 'completed' when current_amount >= goal_amount

-- First, update the status constraint to allow 'completed'
ALTER TABLE donation_campaigns 
DROP CONSTRAINT IF EXISTS donation_campaigns_status_check;

ALTER TABLE donation_campaigns 
ADD CONSTRAINT donation_campaigns_status_check 
CHECK (status IN ('active', 'inactive', 'completed'));

-- Create or replace function to auto-complete campaigns
CREATE OR REPLACE FUNCTION auto_complete_campaign()
RETURNS TRIGGER AS $$
BEGIN
  -- If campaign reaches or exceeds goal and is currently active, mark as completed
  IF NEW.current_amount >= NEW.goal_amount AND NEW.status = 'active' THEN
    NEW.status := 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_complete_campaign ON donation_campaigns;

-- Create trigger that runs before insert or update
CREATE TRIGGER trigger_auto_complete_campaign
  BEFORE INSERT OR UPDATE OF current_amount, goal_amount
  ON donation_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_campaign();

-- Comment on the trigger for documentation
COMMENT ON TRIGGER trigger_auto_complete_campaign ON donation_campaigns IS 
'Automatically marks campaigns as completed when current_amount reaches or exceeds goal_amount';
