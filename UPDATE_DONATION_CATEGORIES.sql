-- UPDATE_DONATION_CATEGORIES.sql
-- Update donation campaign categories to be more relevant for high school alumni

-- Step 1: Update any existing campaigns with old categories to new ones FIRST
UPDATE donation_campaigns 
SET category = 'Academic' 
WHERE category IN ('Library', 'Equipment', 'Education', 'library', 'equipment', 'education');

UPDATE donation_campaigns 
SET category = 'Infrastructure' 
WHERE category IN ('infrastructure', 'Building', 'building', 'Facility', 'facility');

UPDATE donation_campaigns 
SET category = 'Scholarship' 
WHERE category IN ('scholarship', 'scholarships', 'Scholarships');

UPDATE donation_campaigns 
SET category = 'Sports' 
WHERE category IN ('sports', 'sport');

UPDATE donation_campaigns 
SET category = 'Technology' 
WHERE category IN ('technology', 'tech');

UPDATE donation_campaigns 
SET category = 'Emergency' 
WHERE category IN ('emergency');

UPDATE donation_campaigns 
SET category = 'Other' 
WHERE category NOT IN ('Infrastructure', 'Scholarship', 'Sports', 'Technology', 'Academic', 'Events', 'Emergency', 'Other');

-- Step 2: Drop the existing constraint
ALTER TABLE donation_campaigns 
DROP CONSTRAINT IF EXISTS donation_campaigns_category_check;

-- Step 3: Add new constraint with updated categories
ALTER TABLE donation_campaigns 
ADD CONSTRAINT donation_campaigns_category_check 
CHECK (category IN ('Infrastructure', 'Scholarship', 'Sports', 'Technology', 'Academic', 'Events', 'Emergency', 'Other'));

-- Step 4: Verify the changes
SELECT DISTINCT category FROM donation_campaigns ORDER BY category;

-- Comments
COMMENT ON COLUMN donation_campaigns.category IS 'Campaign category: Infrastructure, Scholarship, Sports, Technology, Academic, Events, Emergency, Other';
