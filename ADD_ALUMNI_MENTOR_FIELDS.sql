-- Add alumni mentor fields to products_services for category 'Alumni Mentors'
-- Idempotent: uses IF NOT EXISTS where supported

ALTER TABLE products_services
  ADD COLUMN IF NOT EXISTS mentor_headline TEXT,
  ADD COLUMN IF NOT EXISTS mentor_linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS mentor_website_url TEXT,
  ADD COLUMN IF NOT EXISTS mentor_company TEXT,
  ADD COLUMN IF NOT EXISTS mentor_role TEXT,
  ADD COLUMN IF NOT EXISTS mentor_timezone TEXT,
  ADD COLUMN IF NOT EXISTS mentor_availability TEXT,
  ADD COLUMN IF NOT EXISTS mentor_meeting_formats TEXT[],
  ADD COLUMN IF NOT EXISTS mentor_languages TEXT[],
  ADD COLUMN IF NOT EXISTS mentor_expertise TEXT[],
  ADD COLUMN IF NOT EXISTS mentor_is_pro_bono BOOLEAN,
  ADD COLUMN IF NOT EXISTS mentor_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS mentor_max_mentees INT;

-- Optional: lightweight URL checks (Postgres 14+ could add stricter domain validation with extensions)
-- CREATE DOMAIN IF NOT EXISTS url_text AS TEXT CHECK (mentor_linkedin_url ~* '^https?://'); -- illustrative only

-- Note: Use NULLs when fields are not provided. UI should guard writes by category_name = 'Alumni Mentors'.
