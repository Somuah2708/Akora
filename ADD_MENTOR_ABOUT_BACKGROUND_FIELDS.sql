-- =====================================================
-- ADD SHORT_BIO AND DETAILED_BIO TO MENTOR_APPLICATIONS
-- Add About and Background fields to volunteer applications
-- Run this in Supabase SQL Editor (safe to run multiple times)
-- =====================================================

-- Add short_bio and detailed_bio columns to mentor_applications if they don't exist
DO $$
BEGIN
  -- Add short_bio column (for "About Me")
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='mentor_applications' AND column_name='short_bio'
  ) THEN
    ALTER TABLE public.mentor_applications ADD COLUMN short_bio text;
    RAISE NOTICE '✅ Added short_bio column to mentor_applications';
  ELSE
    RAISE NOTICE 'ℹ️ short_bio column already exists in mentor_applications';
  END IF;

  -- Add detailed_bio column (for "Background")
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='mentor_applications' AND column_name='detailed_bio'
  ) THEN
    ALTER TABLE public.mentor_applications ADD COLUMN detailed_bio text;
    RAISE NOTICE '✅ Added detailed_bio column to mentor_applications';
  ELSE
    RAISE NOTICE 'ℹ️ detailed_bio column already exists in mentor_applications';
  END IF;
END$$;

-- Verify the columns exist
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'mentor_applications'
  AND column_name IN ('short_bio', 'detailed_bio', 'why_mentor', 'what_offer')
ORDER BY column_name;

-- =====================================================
-- NOTES:
-- - short_bio = "About Me" (brief introduction, ~500 chars)
-- - detailed_bio = "Background" (professional journey, ~1000 chars)
-- - why_mentor = "Why do you want to be a mentor?" (motivation)
-- - what_offer = "What can you offer to mentees?" (value proposition)
--
-- When approving applications, the admin panel should now use:
-- - short_bio → alumni_mentors.short_bio
-- - detailed_bio → alumni_mentors.detailed_bio
-- - why_mentor → alumni_mentors.mentorship_philosophy
-- - what_offer → (can be part of detailed_bio or separate field)
-- =====================================================
