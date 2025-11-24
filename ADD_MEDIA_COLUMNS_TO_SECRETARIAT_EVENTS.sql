-- Add missing media columns to secretariat_events table

-- Add banner_url if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'secretariat_events' 
    AND column_name = 'banner_url'
  ) THEN
    ALTER TABLE public.secretariat_events ADD COLUMN banner_url TEXT;
  END IF;
END $$;

-- Add video_url if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'secretariat_events' 
    AND column_name = 'video_url'
  ) THEN
    ALTER TABLE public.secretariat_events ADD COLUMN video_url TEXT;
  END IF;
END $$;

-- Add gallery_urls if it doesn't exist (array of URLs)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'secretariat_events' 
    AND column_name = 'gallery_urls'
  ) THEN
    ALTER TABLE public.secretariat_events ADD COLUMN gallery_urls TEXT[];
  END IF;
END $$;

-- Add tags column if it doesn't exist (array of text)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'secretariat_events' 
    AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.secretariat_events ADD COLUMN tags TEXT[];
  END IF;
END $$;

-- Add organizer_name if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'secretariat_events' 
    AND column_name = 'organizer_name'
  ) THEN
    ALTER TABLE public.secretariat_events ADD COLUMN organizer_name TEXT;
  END IF;
END $$;

-- Add organizer_email if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'secretariat_events' 
    AND column_name = 'organizer_email'
  ) THEN
    ALTER TABLE public.secretariat_events ADD COLUMN organizer_email TEXT;
  END IF;
END $$;

-- Add organizer_phone if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'secretariat_events' 
    AND column_name = 'organizer_phone'
  ) THEN
    ALTER TABLE public.secretariat_events ADD COLUMN organizer_phone TEXT;
  END IF;
END $$;

-- Add registration_url if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'secretariat_events' 
    AND column_name = 'registration_url'
  ) THEN
    ALTER TABLE public.secretariat_events ADD COLUMN registration_url TEXT;
  END IF;
END $$;

-- Add visibility column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'secretariat_events' 
    AND column_name = 'visibility'
  ) THEN
    ALTER TABLE public.secretariat_events ADD COLUMN visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'alumni_only'));
  END IF;
END $$;

COMMENT ON COLUMN public.secretariat_events.banner_url IS 'Main event banner image URL';
COMMENT ON COLUMN public.secretariat_events.video_url IS 'Promotional video URL';
COMMENT ON COLUMN public.secretariat_events.gallery_urls IS 'Array of additional media URLs (images/videos)';
COMMENT ON COLUMN public.secretariat_events.tags IS 'Array of tags for event categorization';
COMMENT ON COLUMN public.secretariat_events.organizer_name IS 'Name of the event organizer';
COMMENT ON COLUMN public.secretariat_events.organizer_email IS 'Email of the event organizer';
COMMENT ON COLUMN public.secretariat_events.organizer_phone IS 'Phone number of the event organizer';
COMMENT ON COLUMN public.secretariat_events.registration_url IS 'URL for event registration';
COMMENT ON COLUMN public.secretariat_events.visibility IS 'Event visibility: public or alumni_only';
