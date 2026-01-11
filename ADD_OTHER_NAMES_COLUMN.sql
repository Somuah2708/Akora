-- Add other_names column to profiles table
-- This stores middle names / other names for users
-- The full_name column will contain: first_name + other_names + surname
-- Display name throughout app should be: first_name + surname only

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS other_names TEXT;

-- Update existing full_name values are already correct (first + surname)
-- New signups will include other_names in full_name if provided
