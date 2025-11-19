-- Add whatsapp_number and profile_photo_url columns, remove twitter_url and website_url from alumni_mentors table
ALTER TABLE alumni_mentors
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
DROP COLUMN IF EXISTS twitter_url,
DROP COLUMN IF EXISTS website_url;

-- Add whatsapp_number and profile_photo_url columns, remove twitter_url and website_url from mentor_applications table
ALTER TABLE mentor_applications
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
DROP COLUMN IF EXISTS twitter_url,
DROP COLUMN IF EXISTS website_url;

-- Comment on the new columns
COMMENT ON COLUMN alumni_mentors.whatsapp_number IS 'WhatsApp contact number for mentor (e.g., +233XXXXXXXXX)';
COMMENT ON COLUMN alumni_mentors.profile_photo_url IS 'URL to mentor profile photo';
COMMENT ON COLUMN mentor_applications.whatsapp_number IS 'WhatsApp contact number for applicant (e.g., +233XXXXXXXXX)';
COMMENT ON COLUMN mentor_applications.profile_photo_url IS 'URL to applicant profile photo';
