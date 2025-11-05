-- Add interests visibility and current study year to profiles, idempotently
DO $$
BEGIN
  -- Add is_interests_public if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_interests_public'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN is_interests_public boolean DEFAULT true;
  END IF;

  -- Add current_study_year if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'current_study_year'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN current_study_year integer;
  END IF;
END$$;

-- Note: No policy changes needed; existing RLS should continue to allow users to update their own profile.
