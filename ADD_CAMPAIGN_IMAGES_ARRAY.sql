-- Add campaign_images column to donation_campaigns table
-- This allows campaigns to have up to 10 images instead of just one

-- Add the new column (array of text URLs)
ALTER TABLE donation_campaigns 
ADD COLUMN IF NOT EXISTS campaign_images TEXT[];

-- Add a comment to document the column
COMMENT ON COLUMN donation_campaigns.campaign_images IS 'Array of up to 10 image URLs for the campaign';

-- Optional: Add a check constraint to limit to 10 images
ALTER TABLE donation_campaigns 
ADD CONSTRAINT campaign_images_max_10 
CHECK (campaign_images IS NULL OR array_length(campaign_images, 1) <= 10);

-- Note: The campaign_image column is kept for backward compatibility
-- If campaign_images array exists and has items, it will be used
-- Otherwise, campaign_image (single) will be used as fallback
